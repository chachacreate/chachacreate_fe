import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useStoreCtx } from "../contexts/StoreContext";

const StorePage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const { setStore } = useStoreCtx();

  useEffect(() => {
    // 실서비스에서는 storeId로 API 호출해서 스토어명/정보 로드
    setStore({ id: storeId || "unknown", name: `스토어 ${storeId}` });
    return () => setStore(null); // 페이지 나갈 때 스토어 컨텍스트 해제
  }, [storeId, setStore]);

  return (
    <section style={{ display: "grid", gap: 8 }}>
      <h1>스토어 상세 - {storeId}</h1>
      <p>헤더에서 “{`스토어 ${storeId}`}에 메시지 보내기” 링크가 보이는지 확인하세요.</p>
    </section>
  );
};

export default StorePage;
