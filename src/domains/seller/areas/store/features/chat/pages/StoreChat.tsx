// src/domains/seller/areas/chat/pages/SellerChat.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import { Search, Send, MessageSquare, Loader2 } from 'lucide-react';
import { get } from '@src/libs/request';
import type { ApiResponse } from '@src/libs/apiResponse';
import { getCurrentUser, isLoggedIn, type UserInfo } from '@src/shared/util/jwtUtils';

/* ---------- Types ---------- */
type Params = { storeUrl?: string };

interface ChatRoom {
  chatroomId: string;
  memberNames?: string[];
  storeName?: string;
  lastMessage?: string;
  roomName?: string;
}

interface ChatMessage {
  senderId: number;
  senderName: string;
  message: string;
  sendAt: string;
  type: 'PERSONAL' | 'ADMIN';
  chatroomId: string;
}

interface DisplayMessage extends ChatMessage {
  messageClass: string;
  formattedDate: string;
  isMyMessage: boolean;
  isAdminMessage: boolean;
}

/* ---------- Utils ---------- */
const fmt = (s: string): string => s.trim().toLowerCase();

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const pad = (n: number): string => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};

// Base64 인코딩/디코딩 유틸리티 함수
const encodeBase64 = (str: string): string => {
  return btoa(unescape(encodeURIComponent(str)));
};

const decodeBase64 = (str: string): string => {
  return decodeURIComponent(escape(atob(str)));
};

// 상대방 이름 추출 (나를 제외한 다른 사용자)
const getPartnerName = (room: ChatRoom, currentUserName: string): string => {
  if (room.chatroomId && room.chatroomId.startsWith('admin_')) {
    return '관리자';
  }

  // memberNames 배열에서 현재 사용자가 아닌 다른 사용자 찾기
  if (room.memberNames && Array.isArray(room.memberNames)) {
    const partner = room.memberNames.find((name) => name !== currentUserName);
    return partner || '알 수 없는 사용자';
  }

  // 다른 구조일 경우 대비
  if (room.storeName) {
    return room.storeName;
  }

  if (room.roomName) {
    return room.roomName;
  }

  return '채팅방';
};

const SellerChat: React.FC = () => {
  const { storeUrl } = useParams<Params>();

  // 현재 로그인한 사용자 정보 (auth 유틸리티에서 가져오기)
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [search, setSearch] = useState('');

  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  /* ---------- 사용자 인증 확인 ---------- */
  useEffect(() => {
    const checkAuth = (): void => {
      if (!isLoggedIn()) {
        console.warn('로그인이 필요합니다.');
        // 실제로는 로그인 페이지로 리다이렉트
        setAuthLoading(false);
        return;
      }

      const userInfo = getCurrentUser();
      if (userInfo) {
        setCurrentUser(userInfo);
      } else {
        console.error('사용자 정보를 가져올 수 없습니다.');
      }
      setAuthLoading(false);
    };

    checkAuth();
  }, []);

  /* ---------- 채팅방 목록 로드 ---------- */
  const loadChatRooms = async (): Promise<void> => {
    if (!currentUser?.memberId) {
      console.error('사용자 정보가 없습니다.');
      setRoomsError('사용자 정보가 없습니다.');
      setRoomsLoading(false);
      return;
    }

    try {
      setRoomsLoading(true);
      setRoomsError(null);

      const response: ApiResponse<ChatRoom[]> = await get(`/chat/rooms/${currentUser.memberId}`);

      // console.log('API Response:', response);

      // ApiResponse 구조에서 실제 데이터 추출
      const allChatrooms = response.data || [];

      // chatrooms가 배열인지 확인
      if (!Array.isArray(allChatrooms)) {
        console.error('Expected array but got:', typeof allChatrooms, allChatrooms);
        setRoomsError('채팅방 데이터 형식 오류');
        return;
      }

      // console.log('전체 채팅방:', allChatrooms);
      // console.log('현재 사용자 이름:', currentUser.name);

      // ✅ 필터링 로직: personal_상대방이름_내이름 패턴만 조회
      const filteredChatrooms = allChatrooms.filter((room) => {
        // console.log('채팅방 검사 중:', room.chatroomId);

        // 1. personal_로 시작하지 않으면 제외
        if (!room.chatroomId || !room.chatroomId.startsWith('personal_')) {
          console.log('제외: personal_로 시작하지 않음');
          return false;
        }

        // 2. personal_ 제거 후 이름 분석
        const namesPart = room.chatroomId.substring('personal_'.length);
        const names = namesPart.split('_');

        // console.log('이름 분석:', names);

        // 3. 정확히 2개의 이름이 있어야 함
        if (names.length !== 2) {
          console.log('제외: 이름 개수가 2개가 아님');
          return false;
        }

        const [partnerName, myName] = names;
        // console.log(
        //   `상대방: "${partnerName}", 내이름: "${myName}", 현재사용자: "${currentUser.name}"`
        // );

        // 4. 두 번째 이름이 현재 사용자와 일치하는지 확인
        const isMatch = myName === currentUser.name;
        // console.log(`매칭 결과: ${isMatch}`);

        return isMatch;
      });

      // console.log('=== 필터링 결과 ===');
      // console.log('전체 채팅방 수:', allChatrooms.length);
      // console.log('필터링된 채팅방 수:', filteredChatrooms.length);
      // console.log(
      //   '필터링된 채팅방:',
      //   filteredChatrooms.map((r) => r.chatroomId)
      // );

      setRooms(filteredChatrooms);
    } catch (error) {
      console.error('AJAX Error:', error);
      setRoomsError('채팅방 목록을 불러오지 못했습니다.');
    } finally {
      setRoomsLoading(false);
    }
  };

  /* ---------- 채팅 히스토리 로드 ---------- */
  const loadChatHistory = async (chatroomId: string): Promise<void> => {
    try {
      const response: ApiResponse<ChatMessage[]> = await get(
        `/chat/history/${encodeBase64(chatroomId)}`
      );

      const history = response.data || [];

      if (Array.isArray(history) && history.length > 0) {
        setMessages(history);
        // 스크롤을 맨 아래로
        setTimeout(() => {
          endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('채팅 히스토리 로드 오류:', error);
      // 히스토리 로드 실패는 치명적이지 않으므로 alert 하지 않음
    }
  };

  /* ---------- WebSocket 연결 ---------- */
  const connectToChatRoom = (chatroomId: string, roomName: string): void => {
    setCurrentRoomId(chatroomId);
    setCurrentRoomName(roomName);

    // 기존 연결 닫기
    if (socketRef.current) {
      socketRef.current.close();
    }

    // 채팅방 ID URL 인코딩 (한글 이름 처리)
    const encodedChatroomId = encodeBase64(chatroomId);

    // WebSocket URL 생성 (JSP와 동일한 구조)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}/ws/chat/${encodedChatroomId}`;

    // console.log('WebSocket URL:', wsUrl); // 디버깅용

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = (): void => {
      // console.log('WebSocket 연결됨: ' + chatroomId);
      setMessages([]);

      // 연결 성공 시 채팅 히스토리 로드
      loadChatHistory(chatroomId);
    };

    socket.onmessage = (event: MessageEvent): void => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
        updateChatRoomPreview(chatroomId, message.message);
      } catch (e) {
        console.error('메시지 파싱 오류:', e);
      }
    };

    socket.onclose = (event: CloseEvent): void => {
      // console.log('WebSocket 닫힘:', event.code, event.reason);
      if (event.code !== 1000) {
        // 정상 종료가 아닌 경우
        console.warn('WebSocket 비정상 종료');
      }
    };

    socket.onerror = (error: Event): void => {
      console.error('WebSocket 오류:', error);
      alert('채팅방 연결에 실패했습니다. 다시 시도해주세요.');
    };
  };

  /* ---------- 메시지 전송 ---------- */
  const sendMessage = (): void => {
    const messageText = msgInput.trim();
    if (!messageText) {
      return; // 빈 메시지는 전송하지 않음
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      alert('채팅방 연결이 끊어졌습니다. 페이지를 새로고침 해주세요.');
      return;
    }

    if (!currentRoomId || !currentUser?.memberId) {
      alert('채팅방을 선택해주세요.');
      return;
    }

    const sendData: ChatMessage = {
      senderId: currentUser.memberId,
      senderName: currentUser.name,
      message: messageText,
      type: getCurrentChatType(),
      chatroomId: currentRoomId,
      sendAt: new Date().toISOString(),
    };

    try {
      socketRef.current.send(JSON.stringify(sendData));
      setMsgInput('');
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  /* ---------- 현재 채팅 타입 판별 ---------- */
  const getCurrentChatType = (): 'PERSONAL' | 'ADMIN' => {
    if (currentRoomId?.startsWith('personal_')) return 'PERSONAL';
    if (currentRoomId?.startsWith('admin_')) return 'ADMIN';
    return 'PERSONAL';
  };

  /* ---------- 채팅방 미리보기 업데이트 ---------- */
  const updateChatRoomPreview = (chatroomId: string, text: string): void => {
    setRooms((prev) =>
      prev.map((room) => (room.chatroomId === chatroomId ? { ...room, lastMessage: text } : room))
    );
  };

  /* ---------- 메시지 표시 ---------- */
  const displayMessage = (message: ChatMessage): DisplayMessage => {
    const formattedDate = formatDate(message.sendAt);
    const isMyMessage = currentUser?.memberId ? message.senderId === currentUser.memberId : false;
    const isAdminMessage = message.type === 'ADMIN' && message.senderName === '관리자';

    let messageClass = '';
    if (isAdminMessage) {
      messageClass = 'admin';
    } else if (isMyMessage) {
      messageClass = 'sent';
    } else {
      messageClass = 'received';
    }

    return { ...message, messageClass, formattedDate, isMyMessage, isAdminMessage };
  };

  /* ---------- 초기 로드 ---------- */
  useEffect(() => {
    if (currentUser?.memberId && !authLoading) {
      loadChatRooms();
    }
  }, [currentUser?.memberId, authLoading]);

  /* ---------- 스크롤 맨 아래 ---------- */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---------- WebSocket 정리 ---------- */
  useEffect(() => {
    return (): void => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ---------- 검색 필터 ---------- */
  const filteredRooms = useMemo(() => {
    if (!currentUser?.name) return [];

    return rooms.filter((room) => {
      const partnerName = getPartnerName(room, currentUser.name);
      return fmt(partnerName).includes(fmt(search));
    });
  }, [rooms, search, currentUser?.name]);

  /* ---------- 로딩 상태 처리 ---------- */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF]">
        <Header />
        <SellerSidenavbar>
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              사용자 정보를 확인하는 중...
            </div>
          </div>
        </SellerSidenavbar>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FFFFFF]">
        <Header />
        <SellerSidenavbar>
          <div className="flex items-center justify-center h-96">
            <div className="text-center text-gray-500">
              <p className="text-lg font-semibold mb-2">로그인이 필요합니다</p>
              <p className="text-sm">채팅 기능을 사용하려면 로그인해주세요.</p>
            </div>
          </div>
        </SellerSidenavbar>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header />

      <SellerSidenavbar>
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {/* 상단 타이틀 */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-[#f9f7ef]">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#2D4739]">채팅</h1>
              <p className="text-sm text-gray-600 mt-0.5">고객과의 대화를 한 곳에서 관리하세요.</p>
            </div>
          </div>

          {/* 메인 2열 */}
          <div className="grid grid-cols-12">
            {/* 좌: 채팅방 리스트 */}
            <aside className="col-span-4 border-r">
              <div className="p-4 sm:p-5">
                {/* 검색 */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="채팅방 검색"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#2D4739]/30"
                  />
                </div>

                {/* 방 목록 */}
                <div className="h-[640px] overflow-y-auto pr-1">
                  {roomsLoading && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      불러오는 중…
                    </div>
                  )}
                  {roomsError && <div className="text-red-600 text-sm">{roomsError}</div>}

                  {!roomsLoading && !roomsError && filteredRooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-gray-500 py-10">
                      <MessageSquare className="w-8 h-8 mb-2" />
                      {rooms.length === 0 ? '채팅방이 없습니다.' : '검색 결과가 없습니다.'}
                    </div>
                  )}

                  <ul className="space-y-2">
                    {filteredRooms.map((room) => {
                      const isActive = currentRoomId === room.chatroomId;
                      const partnerName = getPartnerName(room, currentUser.name);
                      const lastMessage = room.lastMessage || '새 채팅방';

                      return (
                        <li
                          key={room.chatroomId}
                          className={[
                            'p-3 rounded-xl border cursor-pointer transition',
                            'hover:shadow-sm hover:bg-[#2D4739]/5',
                            isActive ? 'bg-[#2D4739]/10 border-[#2D4739]/30' : 'border-gray-200',
                          ].join(' ')}
                          onClick={() => connectToChatRoom(room.chatroomId, partnerName)}
                        >
                          <div className="font-semibold text-gray-800">{partnerName}</div>
                          <div className="text-xs text-gray-500 line-clamp-1 mt-1">
                            {lastMessage}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </aside>

            {/* 우: 메시지 패널 */}
            <section className="col-span-8 flex flex-col">
              {/* 헤더 */}
              <div className="px-4 sm:px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  {currentRoomName || '채팅방을 선택하세요'}
                </h3>
              </div>

              {/* 메시지 리스트 */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fffdf8] min-h-[600px] max-h-[600px]">
                {(!currentRoomId || messages.length === 0) && (
                  <div className="flex flex-col items-center justify-center text-gray-500 h-full select-none">
                    <MessageSquare className="w-10 h-10 mb-2" />
                    {currentRoomId ? '아직 메시지가 없습니다.' : '왼쪽에서 채팅방을 선택하세요.'}
                  </div>
                )}

                {messages.map((message, idx) => {
                  const displayData = displayMessage(message);
                  const isMyMessage = displayData.isMyMessage;
                  const isAdminMessage = displayData.isAdminMessage;

                  return (
                    <div
                      key={idx}
                      className={`mb-3 flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={[
                          'max-w-[72%] rounded-2xl px-4 py-2 shadow-sm',
                          isAdminMessage
                            ? 'bg-yellow-100 border border-yellow-300 rounded-sm'
                            : isMyMessage
                              ? 'bg-[#2D4739] text-white rounded-tr-sm'
                              : 'bg-white border rounded-tl-sm',
                        ].join(' ')}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.message}</p>
                        <div
                          className={[
                            'text-[10px] mt-1',
                            isAdminMessage
                              ? 'text-yellow-700'
                              : isMyMessage
                                ? 'text-white/80'
                                : 'text-gray-400',
                          ].join(' ')}
                        >
                          {displayData.formattedDate}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* 입력 */}
              <div className="px-4 sm:px-6 py-4 border-t bg-white">
                <div className="flex items-center gap-2">
                  <input
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="메시지를 입력하세요"
                    disabled={!currentRoomId}
                    className="flex-1 rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D4739]/30 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!currentRoomId}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-3 bg-[#2D4739] text-white hover:opacity-90 active:opacity-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    전송
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </SellerSidenavbar>
    </div>
  );
};

export default SellerChat;
