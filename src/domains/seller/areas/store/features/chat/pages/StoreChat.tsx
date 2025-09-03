// src/domains/seller/areas/chat/pages/SellerChat.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import { Search, Send, MessageSquare, Loader2 } from "lucide-react";

/* ---------- Types ---------- */
type Params = { storeUrl?: string };

interface ChatRoom {
  chatroomId: string;
  storeName: string;
  storeUrl: string;
  chattingText: string | null;
}

interface ChatMessage {
  chatroomId: string;
  chattingText: string;
  chattingDate: string; // ISO or server date
  memberCheck: number;  // 0=상대, 1=나
}

/* ---------- ENV (선택) ----------
  - VITE_API_BASE: REST API Base URL (예: http://localhost:8080)
  - VITE_WS_URL:   WebSocket URL Base (예: ws://localhost:9999)
---------------------------------- */
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const WS_BASE =
  import.meta.env.VITE_WS_URL ??
  (() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host; // same host/port
    // 서버가 9999 포트로만 WS를 받는다면 아래처럼 바꿔줘도 됨:
    // const host = `${window.location.hostname}:9999`;
    return `${proto}//${host}`;
  })();

/* ---------- Utils ---------- */
const fmt = (s: string) => s.trim().toLowerCase();
const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const SellerChat: React.FC = () => {
  const { storeUrl } = useParams<Params>();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentStoreName, setCurrentStoreName] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [search, setSearch] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  /* ---------- 초기: 채팅방 생성 트리거 (storeUrl가 있는 경우) ---------- */
  useEffect(() => {
    const key = `chatCreated:${storeUrl ?? ""}`;
    if (!storeUrl || sessionStorage.getItem(key)) return;

    fetch(`${API_BASE}/legacy/${storeUrl}/message/makeChatting`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        sessionStorage.setItem(key, "true");
        // 201 성공 아니어도, 중복생성 등 서버 정책에 따라 이미 있을 수 있음
        // 채팅방 목록은 어차피 아래에서 다시 가져옴
      })
      .catch(() => {
        // 실패해도 UX 막지 않음
      });
  }, [storeUrl]);

  /* ---------- 채팅방 목록 ---------- */
  useEffect(() => {
    let alive = true;
    setRoomsLoading(true);
    setRoomsError(null);

    fetch(`${API_BASE}/legacy/main/message/chatrooms`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data?.status === 200) setRooms(data.data as ChatRoom[]);
        else setRoomsError("채팅방 목록을 불러오지 못했습니다.");
      })
      .catch(() => alive && setRoomsError("서버 오류가 발생했습니다."))
      .finally(() => alive && setRoomsLoading(false));

    return () => {
      alive = false;
    };
  }, [storeUrl]);

  /* ---------- WebSocket 연결 ---------- */
  useEffect(() => {
    if (!currentRoomId) return;

    // 기존 소켓 종료
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {}
    }

    // 서버 경로는 기존 JSP 코드와 동일하게 연결
    const ws = new WebSocket(`${WS_BASE}/create/chat/chatserver?chatroomId=${currentRoomId}`);
    socketRef.current = ws;

    ws.onopen = () => {
      // 방 바뀔 때 메시지 리셋
      setMessages([]);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ChatMessage;
        if (!msg?.chattingText) return;
        setMessages((prev) => [...prev, msg]);
        // 방 프리뷰 업데이트
        setRooms((prev) =>
          prev.map((r) => (r.chatroomId === msg.chatroomId ? { ...r, chattingText: msg.chattingText } : r))
        );
      } catch (e) {
        console.error("Invalid message payload:", e);
      }
    };

    ws.onclose = () => {
      // noop
    };
    ws.onerror = (e) => {
      console.error("WebSocket error:", e);
    };

    return () => {
      try {
        ws.close();
      } catch {}
    };
  }, [currentRoomId]);

  /* ---------- 스크롤 맨 아래 ---------- */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------- 전송 ---------- */
  const sendMessage = () => {
    if (!msgInput.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !currentRoomId) {
      alert("메시지를 보낼 수 없습니다. 채팅방을 먼저 선택하세요.");
      return;
    }
    const payload: ChatMessage = {
      chatroomId: currentRoomId,
      chattingText: msgInput,
      chattingDate: new Date().toISOString(),
      memberCheck: 1,
    };
    socketRef.current.send(JSON.stringify(payload));
    setMsgInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ---------- 검색 필터 ---------- */
  const filteredRooms = useMemo(
    () => rooms.filter((r) => fmt(r.storeName).includes(fmt(search))),
    [rooms, search]
  );

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header />
      <Mainnavbar />

      {/* 양쪽 240px 패딩, 내부 1440 컨테이너 */}
    
          <SellerSidenavbar>
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              {/* 상단 타이틀 */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-[#f9f7ef]">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#2D4739]">채팅</h1>
                  <p className="text-sm text-gray-600 mt-0.5">스토어와의 대화를 한 곳에서 관리하세요.</p>
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
                          검색 결과가 없습니다.
                        </div>
                      )}

                      <ul className="space-y-2">
                        {filteredRooms.map((room) => {
                          const isActive = currentRoomId === room.chatroomId;
                          return (
                            <li
                              key={room.chatroomId}
                              className={[
                                "p-3 rounded-xl border cursor-pointer transition",
                                "hover:shadow-sm hover:bg-[#2D4739]/5",
                                isActive ? "bg-[#2D4739]/10 border-[#2D4739]/30" : "border-gray-200",
                              ].join(" ")}
                              onClick={() => {
                                setCurrentRoomId(room.chatroomId);
                                setCurrentStoreName(room.storeName);
                              }}
                            >
                              <div className="font-semibold text-gray-800">{room.storeName}</div>
                              <div className="text-xs text-gray-500 line-clamp-1 mt-1">
                                {room.chattingText ?? "채팅이 없습니다."}
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
                      {currentStoreName || "채팅방을 선택하세요"}
                    </h3>
                  </div>

                  {/* 메시지 리스트 */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fffdf8]">
                    {(!currentRoomId || messages.length === 0) && (
                      <div className="flex flex-col items-center justify-center text-gray-500 h-full select-none">
                        <MessageSquare className="w-10 h-10 mb-2" />
                        {currentRoomId ? "아직 메시지가 없습니다." : "왼쪽에서 채팅방을 선택하세요."}
                      </div>
                    )}

                    {messages.map((m, idx) => {
                      const mine = m.memberCheck === 1;
                      return (
                        <div key={idx} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={[
                              "max-w-[72%] rounded-2xl px-4 py-2 shadow-sm",
                              mine ? "bg-[#2D4739] text-white rounded-tr-sm" : "bg-white border rounded-tl-sm",
                            ].join(" ")}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.chattingText}</p>
                            <div className={["text-[10px] mt-1", mine ? "text-white/80" : "text-gray-400"].join(" ")}>
                              {formatDate(m.chattingDate)}
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="메시지를 입력하세요"
                        className="flex-1 rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D4739]/30"
                      />
                      <button
                        onClick={sendMessage}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-3 bg-[#2D4739] text-white hover:opacity-90 active:opacity-100 transition"
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
