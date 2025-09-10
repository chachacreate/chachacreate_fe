// src/domains/main/areas/mypage/pages/MainMypageClassesPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import MypageSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar";

import { ChevronLeft, Search, Send, MessageSquare, Loader2 } from "lucide-react";
import { get } from "@src/libs/request";
import type { ApiResponse } from "@src/libs/apiResponse";
import { getCurrentUser, isLoggedIn, type UserInfo } from "@src/shared/util/jwtUtils";

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
  type: "PERSONAL" | "ADMIN";
  chatroomId: string;
}

interface DisplayMessage extends ChatMessage {
  messageClass: string;
  formattedDate: string;
  isMyMessage: boolean;
  isAdminMessage: boolean;
}

/* ---------- Utils ---------- */
const BRAND = "#2D4739";

const fmt = (s: string): string => s.trim().toLowerCase();

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const pad = (n: number): string => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};

// Base64
const encodeBase64 = (str: string): string => btoa(unescape(encodeURIComponent(str)));

/** 상대방 이름(나 제외) */
const getPartnerName = (room: ChatRoom, currentUserName: string): string => {
  if (room.chatroomId && room.chatroomId.startsWith("admin_")) return "관리자";
  if (room.memberNames && Array.isArray(room.memberNames)) {
    const partner = room.memberNames.find((name) => name !== currentUserName);
    return partner || "알 수 없는 사용자";
  }
  if (room.storeName) return room.storeName;
  if (room.roomName) return room.roomName;
  return "채팅방";
};

const MainMypageClassesPage: React.FC = () => {
  /** 🔹 /main/mypage/classes 와 /:storeUrl/mypage/classes 둘 다 지원 */
  const { storeUrl } = useParams<Params>();

  // 로그인/유저
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 채팅방 상태
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  // 현재 방/메시지
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [search, setSearch] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  /* ---------- 인증 ---------- */
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

  /* ---------- 채팅방 목록 ---------- */
  const loadChatRooms = async (): Promise<void> => {
    if (!currentUser?.memberId) {
      setRoomsError("사용자 정보가 없습니다.");
      setRoomsLoading(false);
      return;
    }

    try {
      setRoomsLoading(true);
      setRoomsError(null);

      // 필요 시 storeUrl를 쿼리로 넘겨 서버에서 필터링 가능 (백엔드 규격에 맞게 조정)
      const response: ApiResponse<ChatRoom[]> = await get(`/chat/rooms/${currentUser.memberId}`, {
        storeUrl: storeUrl || "",
      });

      const allChatrooms = response.data || [];
      if (!Array.isArray(allChatrooms)) {
        setRoomsError("채팅방 데이터 형식 오류");
        return;
      }

      // personal_{상대방}_{내이름} 패턴만
      const filtered = allChatrooms.filter((room) => {
        if (!room.chatroomId?.startsWith("personal_")) return false;
        const namesPart = room.chatroomId.substring("personal_".length);
        const names = namesPart.split("_");
        if (names.length !== 2) return false;
        const [, myName] = names;
        return myName === currentUser.name;
      });

      setRooms(filtered);
    } catch (error) {
      console.error(error);
      setRoomsError("채팅방 목록을 불러오지 못했습니다.");
    } finally {
      setRoomsLoading(false);
    }
  };

  /* ---------- 히스토리 ---------- */
  const loadChatHistory = async (chatroomId: string): Promise<void> => {
    try {
      const response: ApiResponse<ChatMessage[]> = await get(`/chat/history/${encodeBase64(chatroomId)}`);
      const history = response.data || [];
      if (Array.isArray(history) && history.length > 0) {
        setMessages(history);
        setTimeout(() => {
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("채팅 히스토리 로드 오류:", error);
    }
  };

  /* ---------- WebSocket ---------- */
  const connectToChatRoom = (chatroomId: string, roomName: string): void => {
    setCurrentRoomId(chatroomId);
    setCurrentRoomName(roomName);

    if (socketRef.current) socketRef.current.close();

    const encodedChatroomId = encodeBase64(chatroomId);
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host; // host:port
    const wsUrl = `${protocol}//${host}/ws/chat/${encodedChatroomId}`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setMessages([]);
      loadChatHistory(chatroomId);
    };
    socket.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
        // 채팅방 목록 미리보기 갱신
        setRooms((prev) => prev.map((r) => (r.chatroomId === chatroomId ? { ...r, lastMessage: message.message } : r)));
      } catch (e) {
        console.error("메시지 파싱 오류:", e);
      }
    };
    socket.onclose = (event) => {
      if (event.code !== 1000) console.warn("WebSocket 비정상 종료");
    };
    socket.onerror = (error) => {
      console.error("WebSocket 오류:", error);
      alert("채팅방 연결에 실패했습니다. 다시 시도해주세요.");
    };
  };

  /* 👉 모바일에서 목록 화면으로 돌아가기 (소켓 정리 포함) */
  const leaveRoom = () => {
    try {
      socketRef.current?.close();
    } catch {}
    setCurrentRoomId(null);
    setCurrentRoomName("");
    setMessages([]);
  };

  /* ---------- 메시지 전송 ---------- */
  const getCurrentChatType = (): "PERSONAL" | "ADMIN" => {
    if (currentRoomId?.startsWith("personal_")) return "PERSONAL";
    if (currentRoomId?.startsWith("admin_")) return "ADMIN";
    return "PERSONAL";
  };

  const sendMessage = (): void => {
    const messageText = msgInput.trim();
    if (!messageText) return;
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      alert("채팅방 연결이 끊어졌습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    if (!currentRoomId || !currentUser?.memberId) {
      alert("채팅방을 선택해주세요.");
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
      setMsgInput("");
    } catch (error) {
      console.error("메시지 전송 오류:", error);
      alert("메시지 전송에 실패했습니다.");
    }
  };

  /* ---------- 표시 데이터 ---------- */
  const displayMessage = (message: ChatMessage): DisplayMessage => {
    const formattedDate = formatDate(message.sendAt);
    const isMyMessage = currentUser?.memberId ? message.senderId === currentUser.memberId : false;
    const isAdminMessage = message.type === "ADMIN" && message.senderName === "관리자";
    const messageClass = isAdminMessage ? "admin" : isMyMessage ? "sent" : "received";
    return { ...message, formattedDate, isMyMessage, isAdminMessage, messageClass };
  };

  /* ---------- 라이프사이클 ---------- */
  useEffect(() => {
    if (currentUser?.memberId && !authLoading) loadChatRooms();
  }, [currentUser?.memberId, authLoading, storeUrl]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  /* ---------- 검색 ---------- */
  const filteredRooms = useMemo(() => {
    if (!currentUser?.name) return [];
    return rooms.filter((room) => {
      const partnerName = getPartnerName(room, currentUser.name);
      return fmt(partnerName).includes(fmt(search));
    });
  }, [rooms, search, currentUser?.name]);

  /* ---------- 상태 뷰 ---------- */
  if (authLoading) {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)" }}>
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
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)" }}>
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

  /* ---------- UI ---------- */
  return (
    <div
      className="min-h-screen font-jua pb-12"
      style={{ background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)" }}
    >
      <Header />
      <Mainnavbar />

      {/* 📱 모바일: 상단 헤더는 항상 "뒤로가기 + 채팅방 문의", 목록은 콘텐츠로 내려감 */}
      <div className="lg:hidden">
        {/* 상단 고정 바 */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentRoomId) {
                  // 채팅방 내부 → 목록으로
                  leaveRoom();
                } else {
                  // 목록 화면 → 마이페이지로
                  history.length > 1 ? history.back() : (window.location.href = "/main/mypage");
                }
              }}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">채팅방 문의</h1>
            <div className="flex-1" />
          </div>
        </div>

        {/* 본문: currentRoomId 없으면 목록, 있으면 채팅 */}
        {!currentRoomId ? (
          // ✅ 목록 화면
          <div className="px-4 py-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
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
                    {rooms.length === 0 ? "채팅방이 없습니다." : "검색 결과가 없습니다."}
                  </div>
                )}

                <ul className="space-y-2">
                  {filteredRooms.map((room) => {
                    const partnerName = getPartnerName(room, currentUser?.name ?? "");
                    const lastMessage = room.lastMessage || "새 채팅방";
                    return (
                      <li
                        key={room.chatroomId}
                        className="p-3 rounded-xl border border-gray-200 cursor-pointer transition hover:shadow-sm hover:bg-[#2D4739]/5"
                        onClick={() => connectToChatRoom(room.chatroomId, partnerName)}
                      >
                        <div className="font-semibold text-gray-800">{partnerName}</div>
                        <div className="text-xs text-gray-500 line-clamp-1 mt-1">{lastMessage}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          // ✅ 채팅 화면
          <div className="px-0 py-0">
            <div className="bg-[#f2f2f2] min-h-[calc(100vh-56px)] flex flex-col">
              {/* 메시지 리스트 */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-gray-500 h-full select-none">
                    <MessageSquare className="w-10 h-10 mb-2" />
                    아직 메시지가 없습니다.
                  </div>
                )}

                {messages.map((message, idx) => {
                  const d = displayMessage(message);
                  const isMine = d.isMyMessage;
                  const isAdmin = d.isAdminMessage;
                  return (
                    <div key={idx} className={`mb-2.5 flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm",
                          isAdmin
                            ? "bg-yellow-100 border border-yellow-300 rounded-sm"
                            : isMine
                            ? "bg-[#FEE500] text-black" // 카톡 느낌 (모바일)
                            : "bg-white border",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
                        <div
                          className={[
                            "text-[10px] mt-1",
                            isAdmin ? "text-yellow-700" : isMine ? "text-black/60" : "text-gray-400",
                          ].join(" ")}
                        >
                          {d.formattedDate}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* 입력 */}
              <div className="px-3 py-3 border-t bg-white">
                <div className="flex items-center gap-2">
                  <input
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="메시지를 입력하세요"
                    className="flex-1 rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D4739]/20"
                  />
                  <button
                    onClick={sendMessage}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-white hover:opacity-90 active:opacity-100 transition"
                    style={{ backgroundColor: BRAND }}
                  >
                    <Send className="w-4 h-4" />
                    전송
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 바닥 여백 */}
        <div className="pb-6" />
      </div>

      {/* 🖥️ 데스크톱: 기존 레이아웃 유지 (원본 코드 손대지 않음) */}
      <div className="hidden lg:block">
        {/* ✅ 오른쪽 콘텐츠: 마이페이지 레이아웃에 삽입 */}
        <MypageSidenavbar>
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* 상단 헤더 */}
              <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-[#2d4739] to-gray-800">
                <div>
                  <h1 className="text-xl md:text-2xl text-white">채팅방 문의</h1>
                  <p className="text-xs md:text-sm text-gray-200 mt-0.5">
                    {storeUrl ? (
                      <>
                        <span className="font-semibold">{storeUrl}</span> 스토어에 대한 고객 문의를 관리하세요.
                      </>
                    ) : (
                      <>고객과의 대화를 한 곳에서 관리하세요.</>
                    )}
                  </p>
                </div>
              </div>

              {/* 본문: 2열 그리드 (좌: 방목록 / 우: 메시지) */}
              <div className="grid grid-cols-12">
                {/* 좌측 채팅방 목록 */}
                <aside className="col-span-12 md:col-span-4 border-b md:border-b-0 md:border-r bg-white">
                  <div className="p-4 md:p-5">
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
                          {rooms.length === 0 ? "채팅방이 없습니다." : "검색 결과가 없습니다."}
                        </div>
                      )}

                      <ul className="space-y-2">
                        {filteredRooms.map((room) => {
                          const isActive = currentRoomId === room.chatroomId;
                          const partnerName = getPartnerName(room, currentUser.name);
                          const lastMessage = room.lastMessage || "새 채팅방";
                          return (
                            <li
                              key={room.chatroomId}
                              className={[
                                "p-3 rounded-xl border cursor-pointer transition",
                                "hover:shadow-sm hover:bg-[#2D4739]/5",
                                isActive ? "bg-[#2D4739]/10 border-[#2D4739]/30" : "border-gray-200",
                              ].join(" ")}
                              onClick={() => connectToChatRoom(room.chatroomId, partnerName)}
                            >
                              <div className="font-semibold text-gray-800">{partnerName}</div>
                              <div className="text-xs text-gray-500 line-clamp-1 mt-1">{lastMessage}</div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </aside>

                {/* 우측 메시지 */}
                <section className="col-span-12 md:col-span-8 flex flex-col bg-[#f9fafb]">
                  {/* 우측 헤더 */}
                  <div className="px-4 md:px-6 py-4 border-b bg-white/70 backdrop-blur">
                    <h3 className="text-lg text-gray-800">
                      {currentRoomName || "채팅방을 선택하세요"}
                    </h3>
                  </div>

                  {/* 메시지 리스트 */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-[400px] md:min-h-[600px]">
                    {(!currentRoomId || messages.length === 0) && (
                      <div className="flex flex-col items-center justify-center text-gray-500 h-full select-none">
                        <MessageSquare className="w-10 h-10 mb-2" />
                        {currentRoomId ? "아직 메시지가 없습니다." : "왼쪽에서 채팅방을 선택하세요."}
                      </div>
                    )}

                    {messages.map((message, idx) => {
                      const d = displayMessage(message);
                      const isMine = d.isMyMessage;
                      const isAdmin = d.isAdminMessage;
                      return (
                        <div key={idx} className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={[
                              "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
                              isAdmin
                                ? "bg-yellow-100 border border-yellow-300 rounded-sm"
                                : isMine
                                ? "bg-[#2D4739] text-white rounded-tr-sm"
                                : "bg-white border rounded-tl-sm",
                            ].join(" ")}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.message}</p>
                            <div
                              className={[
                                "text-[10px] mt-1",
                                isAdmin ? "text-yellow-700" : isMine ? "text-white/80" : "text-gray-400",
                              ].join(" ")}
                            >
                              {d.formattedDate}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={endRef} />
                  </div>

                  {/* 입력 영역 */}
                  <div className="px-4 md:px-6 py-4 border-t bg-white">
                    <div className="flex items-center gap-2">
                      <input
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="메시지를 입력하세요"
                        disabled={!currentRoomId}
                        className="flex-1 rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D4739]/30 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!currentRoomId}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-white hover:opacity-90 active:opacity-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: BRAND }}
                      >
                        <Send className="w-4 h-4" />
                        전송
                      </button>
                    </div>
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
