// src/domains/main/areas/mypage/pages/MainMypageClassesPage.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import MypageSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar';

import { ChevronLeft, Search, Send, MessageSquare, Loader2 } from 'lucide-react';
import { get } from '@src/libs/request';
import type { ApiResponse } from '@src/libs/apiResponse';
import { getCurrentUser, isLoggedIn, type UserInfo } from '@src/shared/util/jwtUtils';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';

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
const BRAND = '#2D4739';

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

const encodeBase64 = (str: string): string => btoa(unescape(encodeURIComponent(str)));

const getPartnerName = (room: ChatRoom, currentUserName: string): string => {
  if (room.chatroomId && room.chatroomId.startsWith('admin_')) return '관리자';

  if (room.chatroomId && room.chatroomId.startsWith('personal_')) {
    const namesPart = room.chatroomId.substring('personal_'.length);
    const names = namesPart.split('_');

    if (names.length === 2) {
      const [myName, partnerName] = names;
      if (myName === currentUserName) {
        return partnerName;
      }
    }
  }

  if (room.memberNames && Array.isArray(room.memberNames)) {
    const partner = room.memberNames.find((name) => name !== currentUserName);
    return partner || '알 수 없는 사용자';
  }
  if (room.storeName) return room.storeName;
  if (room.roomName) return room.roomName;
  return '채팅방';
};

/* ---------- Components ---------- */
// ✅ 입력 컴포넌트를 ref 기반으로 완전히 분리
const ChatInputWithRef: React.FC<{
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}> = React.memo(({ onSendMessage, disabled = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const value = inputRef.current?.value.trim();
    if (!value) return;

    onSendMessage(value);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const buttonStyle = useMemo(() => ({ backgroundColor: BRAND }), []);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        placeholder="메시지를 입력하세요"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className="flex-1 rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D4739]/30 disabled:bg-gray-100 disabled:cursor-not-allowed"
        autoComplete="off"
      />
      <button
        onClick={handleSend}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-white hover:opacity-90 active:opacity-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        style={buttonStyle}
      >
        <Send className="w-4 h-4" />
        전송
      </button>
    </div>
  );
});

interface MessageItemProps {
  message: ChatMessage;
  isMyMessage: boolean;
  isAdminMessage: boolean;
  formattedDate: string;
  isMobile?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = React.memo(
  ({ message, isMyMessage, isAdminMessage, formattedDate, isMobile = false }) => {
    const containerClassName = useMemo(
      () => `${isMobile ? 'mb-2.5' : 'mb-3'} flex ${isMyMessage ? 'justify-end' : 'justify-start'}`,
      [isMobile, isMyMessage]
    );

    const messageClassName = useMemo(() => {
      const baseClasses = `max-w-[80%] rounded-2xl ${isMobile ? 'px-3.5 py-2' : 'px-4 py-2'} shadow-sm`;

      if (isAdminMessage) {
        return `${baseClasses} bg-yellow-100 border border-yellow-300 rounded-sm`;
      }

      if (isMyMessage) {
        return isMobile
          ? `${baseClasses} bg-[#FEE500] text-black`
          : `${baseClasses} bg-[#2D4739] text-white rounded-tr-sm`;
      }

      return isMobile
        ? `${baseClasses} bg-white border`
        : `${baseClasses} bg-white border rounded-tl-sm`;
    }, [isAdminMessage, isMyMessage, isMobile]);

    const textClassName = useMemo(
      () => `whitespace-pre-wrap break-words ${isMobile ? 'leading-relaxed' : ''}`,
      [isMobile]
    );

    const dateClassName = useMemo(() => {
      const baseClass = 'text-[10px] mt-1';

      if (isAdminMessage) return `${baseClass} text-yellow-700`;
      if (isMyMessage) {
        return isMobile ? `${baseClass} text-black/60` : `${baseClass} text-white/80`;
      }
      return `${baseClass} text-gray-400`;
    }, [isAdminMessage, isMyMessage, isMobile]);

    return (
      <div className={containerClassName}>
        <div className={messageClassName}>
          <p className={textClassName}>{message.message}</p>
          <div className={dateClassName}>{formattedDate}</div>
        </div>
      </div>
    );
  }
);

interface ChatRoomItemProps {
  room: ChatRoom;
  isActive: boolean;
  currentUserName: string;
  onRoomClick: (chatroomId: string, roomName: string) => void;
}

const ChatRoomItem: React.FC<ChatRoomItemProps> = React.memo(
  ({ room, isActive, currentUserName, onRoomClick }) => {
    const partnerName = useMemo(
      () => getPartnerName(room, currentUserName),
      [room, currentUserName]
    );

    const lastMessage = useMemo(() => room.lastMessage || '새 채팅방', [room.lastMessage]);

    const handleClick = useCallback(() => {
      onRoomClick(room.chatroomId, partnerName);
    }, [room.chatroomId, partnerName, onRoomClick]);

    const itemClassName = useMemo(() => {
      const baseClasses =
        'p-3 rounded-xl border cursor-pointer transition hover:shadow-sm hover:bg-[#2D4739]/5';
      return isActive
        ? `${baseClasses} bg-[#2D4739]/10 border-[#2D4739]/30`
        : `${baseClasses} border-gray-200`;
    }, [isActive]);

    return (
      <li className={itemClassName} onClick={handleClick}>
        <div className="font-semibold text-gray-800">{partnerName}</div>
        <div className="text-xs text-gray-500 line-clamp-1 mt-1">{lastMessage}</div>
      </li>
    );
  }
);

// ✅ 검색 상태를 컴포넌트 내부로 이동하여 리렌더링 격리
interface ChatRoomListProps {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  currentUser: UserInfo;
  roomsLoading: boolean;
  roomsError: string | null;
  onRoomClick: (chatroomId: string, roomName: string) => void;
}

const ChatRoomList: React.FC<ChatRoomListProps> = React.memo(
  ({ rooms, currentRoomId, currentUser, roomsLoading, roomsError, onRoomClick }) => {
    // ✅ 검색 상태를 컴포넌트 내부로 이동하여 리렌더링 격리
    const [search, setSearch] = useState('');

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    }, []);

    // ✅ 필터링 로직도 컴포넌트 내부로 이동
    const filteredRooms = useMemo(() => {
      if (!currentUser?.name) return [];
      if (!search.trim()) return rooms;

      const searchLower = search.toLowerCase().trim();
      return rooms.filter((room) => {
        const partnerName = getPartnerName(room, currentUser.name);
        return partnerName.toLowerCase().includes(searchLower);
      });
    }, [rooms, search, currentUser?.name]);

    const emptyStateMessage = useMemo(
      () => (rooms.length === 0 ? '채팅방이 없습니다.' : '검색 결과가 없습니다.'),
      [rooms.length]
    );

    return (
      <>
        {/* 검색 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder="채팅방 검색"
            className="w-full pl-9 pr-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#2D4739]/30"
          />
        </div>

        {/* 방 목록 */}
        <div className="h-[320px] md:h-[640px] overflow-y-auto pr-1">
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
              {emptyStateMessage}
            </div>
          )}

          <ul className="space-y-2">
            {filteredRooms.map((room) => (
              <ChatRoomItem
                key={room.chatroomId}
                room={room}
                isActive={currentRoomId === room.chatroomId}
                currentUserName={currentUser.name}
                onRoomClick={onRoomClick}
              />
            ))}
          </ul>
        </div>
      </>
    );
  }
);

const MobileChatRoomList: React.FC<{
  rooms: ChatRoom[];
  currentUser: UserInfo;
  roomsLoading: boolean;
  roomsError: string | null;
  onRoomClick: (chatroomId: string, roomName: string) => void;
}> = React.memo(({ rooms, currentUser, roomsLoading, roomsError, onRoomClick }) => {
  // ✅ 검색 상태를 컴포넌트 내부로 이동
  const [search, setSearch] = useState('');

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  // ✅ 필터링 로직도 컴포넌트 내부로 이동
  const filteredRooms = useMemo(() => {
    if (!currentUser?.name) return [];
    if (!search.trim()) return rooms;

    const searchLower = search.toLowerCase().trim();
    return rooms.filter((room) => {
      const partnerName = getPartnerName(room, currentUser.name);
      return partnerName.toLowerCase().includes(searchLower);
    });
  }, [rooms, search, currentUser?.name]);

  const emptyStateMessage = useMemo(
    () => (rooms.length === 0 ? '채팅방이 없습니다.' : '검색 결과가 없습니다.'),
    [rooms.length]
  );

  return (
    <div className="px-4 py-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder="채팅방 검색"
            className="w-full pl-9 pr-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#2D4739]/30"
          />
        </div>

        <div className="max-h-[65vh] overflow-y-auto pr-1">
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
              {emptyStateMessage}
            </div>
          )}

          <ul className="space-y-2">
            {filteredRooms.map((room) => (
              <ChatRoomItem
                key={room.chatroomId}
                room={room}
                isActive={false}
                currentUserName={currentUser?.name ?? ''}
                onRoomClick={onRoomClick}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

/* ---------- Main Component ---------- */
const MainMypageClassesPage: React.FC = () => {
  const { storeUrl } = useParams<Params>();

  // ✅ search 상태 제거 - 각 컴포넌트에서 독립적으로 관리
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 인증 체크
  useEffect(() => {
    const checkAuth = (): void => {
      if (!isLoggedIn()) {
        setAuthLoading(false);
        return;
      }
      const userInfo = getCurrentUser();
      if (userInfo) setCurrentUser(userInfo);
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  // 채팅방 목록 로드
  const loadChatRooms = useCallback(async (): Promise<void> => {
    if (!currentUser?.memberId) {
      setRoomsError('사용자 정보가 없습니다.');
      setRoomsLoading(false);
      return;
    }

    try {
      setRoomsLoading(true);
      setRoomsError(null);

      const response: ApiResponse<ChatRoom[]> = await get(`/chat/rooms/${currentUser.memberId}`, {
        storeUrl: storeUrl || '',
      });

      const allChatrooms = response.data || [];
      if (!Array.isArray(allChatrooms)) {
        setRoomsError('채팅방 데이터 형식 오류');
        return;
      }

      const filtered = allChatrooms.filter((room) => {
        if (!room.chatroomId || !room.chatroomId.startsWith('personal_')) {
          return false;
        }

        const namesPart = room.chatroomId.substring('personal_'.length);
        const names = namesPart.split('_');

        if (names.length !== 2) {
          return false;
        }

        const [myName] = names;
        return myName === currentUser.name;
      });

      setRooms(filtered);
    } catch (error) {
      console.error(error);
      setRoomsError('채팅방 목록을 불러오지 못했습니다.');
    } finally {
      setRoomsLoading(false);
    }
  }, [currentUser?.memberId, currentUser?.name, storeUrl]);

  // 채팅 히스토리 로드
  const loadChatHistory = useCallback(async (chatroomId: string): Promise<void> => {
    try {
      const response: ApiResponse<ChatMessage[]> = await get(
        `/chat/history/${encodeBase64(chatroomId)}`
      );
      const history = response.data || [];
      if (Array.isArray(history) && history.length > 0) {
        setMessages(history);
        setTimeout(() => {
          endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('채팅 히스토리 로드 오류:', error);
    }
  }, []);

  // WebSocket 연결
  const connectToChatRoom = useCallback(
    (chatroomId: string, roomName: string): void => {
      setCurrentRoomId(chatroomId);
      setCurrentRoomName(roomName);

      if (socketRef.current) socketRef.current.close();

      const encodedChatroomId = encodeBase64(chatroomId);
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/chat/${encodedChatroomId}`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket 연결됨: ' + chatroomId);
        setMessages([]);
        loadChatHistory(chatroomId);
      };

      socket.onmessage = (event) => {
        try {
          const message: ChatMessage = JSON.parse(event.data);
          setMessages((prev) => [...prev, message]);
          setRooms((prev) =>
            prev.map((r) =>
              r.chatroomId === chatroomId ? { ...r, lastMessage: message.message } : r
            )
          );
        } catch (e) {
          console.error('메시지 파싱 오류:', e);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket 닫힘:', event.code, event.reason);
        if (event.code !== 1000) console.warn('WebSocket 비정상 종료');
      };

      socket.onerror = (error) => {
        console.error('WebSocket 오류:', error);
        alert('채팅방 연결에 실패했습니다. 다시 시도해주세요.');
      };
    },
    [loadChatHistory]
  );

  // 방 나가기
  const leaveRoom = useCallback(() => {
    try {
      socketRef.current?.close();
    } catch {}
    setCurrentRoomId(null);
    setCurrentRoomName('');
    setMessages([]);
  }, []);

  // ✅ 메시지 전송 - msgInput 의존성 제거로 리렌더링 방지
  const handleSendMessage = useCallback(
    (messageText: string): void => {
      if (!messageText.trim()) return;
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        alert('채팅방 연결이 끊어졌습니다. 새로고침 후 다시 시도해주세요.');
        return;
      }
      if (!currentRoomId || !currentUser?.memberId) {
        alert('채팅방을 선택해주세요.');
        return;
      }

      const sendData = {
        senderId: currentUser.memberId,
        senderName: currentUser.name,
        message: messageText,
        type: currentRoomId?.startsWith('personal_') ? ('PERSONAL' as const) : ('ADMIN' as const),
        chatroomId: currentRoomId,
      };

      try {
        socketRef.current.send(JSON.stringify(sendData));
      } catch (error) {
        console.error('메시지 전송 오류:', error);
        alert('메시지 전송에 실패했습니다.');
      }
    },
    [currentRoomId, currentUser?.memberId, currentUser?.name]
  );

  // 메시지 표시 데이터
  const displayMessage = useCallback(
    (message: ChatMessage): DisplayMessage => {
      const formattedDate = formatDate(message.sendAt);
      const isMyMessage = currentUser?.memberId ? message.senderId === currentUser.memberId : false;
      const isAdminMessage = message.type === 'ADMIN' && message.senderName === '관리자';
      const messageClass = isAdminMessage ? 'admin' : isMyMessage ? 'sent' : 'received';
      return { ...message, formattedDate, isMyMessage, isAdminMessage, messageClass };
    },
    [currentUser?.memberId]
  );

  // 이펙트
  useEffect(() => {
    if (currentUser?.memberId && !authLoading) loadChatRooms();
  }, [currentUser?.memberId, authLoading, loadChatRooms]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // ✅ 핸들러 - search 관련 핸들러 제거
  const handleBackClick = useCallback(() => {
    if (currentRoomId) {
      leaveRoom();
    } else {
      history.length > 1 ? history.back() : (window.location.href = '/main/mypage');
    }
  }, [currentRoomId, leaveRoom]);

  // 메모이제이션된 스타일과 텍스트
  const backgroundStyle = useMemo(
    () => ({
      background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
    }),
    []
  );

  const headerGradientStyle = useMemo(
    () => ({
      background: 'linear-gradient(to right, #2d4739, rgb(31, 41, 55))',
    }),
    []
  );

  const storeDescription = useMemo(() => {
    if (storeUrl) {
      return (
        <>
          <span className="font-semibold">{storeUrl}</span> 스토어에 대한 고객 문의를 관리하세요.
        </>
      );
    }
    return <>고객과의 대화를 한 곳에서 관리하세요.</>;
  }, [storeUrl]);

  // 로딩 상태
  if (authLoading) {
    return (
      <div className="min-h-screen" style={backgroundStyle}>
        <Header />
        <Mainnavbar />
        <MypageSidenavbar>
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              사용자 정보를 확인하는 중...
            </div>
          </div>
        </MypageSidenavbar>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen" style={backgroundStyle}>
        <Header />
        <Mainnavbar />
        <MypageSidenavbar>
          <div className="flex items-center justify-center h-96">
            <div className="text-center text-gray-500">
              <p className="text-lg font-semibold mb-2">로그인이 필요합니다</p>
              <p className="text-sm">서비스를 이용하려면 로그인해주세요.</p>
            </div>
          </div>
        </MypageSidenavbar>
      </div>
    );
  }
  const isMain = location.pathname.startsWith('/main');
  return (
    <div className="min-h-screen font-jua pb-12" style={backgroundStyle}>
      <Header />
      {isMain ? <Mainnavbar /> : <Storenavbar />}

      {/* 📱 모바일 */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackClick}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">채팅방 문의</h1>
          </div>
        </div>

        {!currentRoomId ? (
          <MobileChatRoomList
            rooms={rooms}
            currentUser={currentUser}
            roomsLoading={roomsLoading}
            roomsError={roomsError}
            onRoomClick={connectToChatRoom}
          />
        ) : (
          <div className="px-0 py-0">
            <div className="bg-[#f2f2f2] min-h-[calc(100vh-56px)] flex flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-gray-500 h-full select-none">
                    <MessageSquare className="w-10 h-10 mb-2" />
                    아직 메시지가 없습니다.
                  </div>
                )}

                {messages.map((message, idx) => {
                  const d = displayMessage(message);
                  return (
                    <MessageItem
                      key={idx}
                      message={message}
                      isMyMessage={d.isMyMessage}
                      isAdminMessage={d.isAdminMessage}
                      formattedDate={d.formattedDate}
                      isMobile={true}
                    />
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="px-3 py-3 border-t bg-white">
                <ChatInputWithRef onSendMessage={handleSendMessage} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🖥️ 데스크톱 */}
      <div className="hidden lg:block">
        <MypageSidenavbar>
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between px-6 py-5 border-b"
                style={headerGradientStyle}
              >
                <div>
                  <h1 className="text-xl md:text-2xl text-white">채팅방 문의</h1>
                  <p className="text-xs md:text-sm text-gray-200 mt-0.5">{storeDescription}</p>
                </div>
              </div>

              <div className="grid grid-cols-12">
                <aside className="col-span-12 md:col-span-4 border-b md:border-b-0 md:border-r bg-white">
                  <div className="p-4 md:p-5">
                    <ChatRoomList
                      rooms={rooms}
                      currentRoomId={currentRoomId}
                      currentUser={currentUser}
                      roomsLoading={roomsLoading}
                      roomsError={roomsError}
                      onRoomClick={connectToChatRoom}
                    />
                  </div>
                </aside>

                <section className="col-span-12 md:col-span-8 flex flex-col bg-[#f9fafb]">
                  <div className="px-4 md:px-6 py-4 border-b bg-white/70 backdrop-blur">
                    <h3 className="text-lg text-gray-800">
                      {currentRoomName || '채팅방을 선택하세요'}
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-[400px] md:min-h-[600px]">
                    {(!currentRoomId || messages.length === 0) && (
                      <div className="flex flex-col items-center justify-center text-gray-500 h-full select-none">
                        <MessageSquare className="w-10 h-10 mb-2" />
                        {currentRoomId
                          ? '아직 메시지가 없습니다.'
                          : '왼쪽에서 채팅방을 선택하세요.'}
                      </div>
                    )}

                    {messages.map((message, idx) => {
                      const d = displayMessage(message);
                      return (
                        <MessageItem
                          key={idx}
                          message={message}
                          isMyMessage={d.isMyMessage}
                          isAdminMessage={d.isAdminMessage}
                          formattedDate={d.formattedDate}
                          isMobile={false}
                        />
                      );
                    })}
                    <div ref={endRef} />
                  </div>

                  <div className="px-4 md:px-6 py-4 border-t bg-white">
                    <ChatInputWithRef onSendMessage={handleSendMessage} disabled={!currentRoomId} />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </MypageSidenavbar>
      </div>
    </div>
  );
};

export default MainMypageClassesPage;
