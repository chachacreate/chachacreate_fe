// src/types/daum-postcode.d.ts
export {};

declare global {
  /** daum.Postcode 생성자 타입 */
  interface PostcodeConstructor {
    new (options: {
      oncomplete: (data: any) => void;
      onresize?: (size: any) => void;
      onclose?: () => void;
    }): { open: () => void };
  }

  interface Window {
    /**
     * 이미 존재할 수 있는 선언과 동일한 형태로 보강(augmentation).
     * 일부 환경은 daum.postcode.load(...)를 제공하므로 같이 정의합니다.
     */
    daum?: {
      postcode: {
        load: (fn: () => void) => void;
        version: string;
        _validParam_: boolean;
      };
      Postcode: PostcodeConstructor;
    };
  }
}
