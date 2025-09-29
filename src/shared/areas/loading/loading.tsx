// RabbitLoader.tsx
import React from "react";

const RabbitLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      {/* 토끼 얼굴 */}
      <div className="relative w-24 h-24 bg-white border-4 border-[#2d4739] rounded-full animate-bounce">
        {/* 귀 */}
        <div className="absolute -top-10 left-4 w-6 h-12 bg-white border-4 border-[#2d4739] rounded-full animate-[wiggle_1s_infinite] origin-bottom"></div>
        <div className="absolute -top-10 right-4 w-6 h-12 bg-white border-4 border-[#2d4739] rounded-full animate-[wiggle_1s_infinite] origin-bottom delay-150"></div>

        {/* 눈 */}
        <div className="absolute top-8 left-6 w-3 h-3 bg-[#2d4739] rounded-full"></div>
        <div className="absolute top-8 right-6 w-3 h-3 bg-[#2d4739] rounded-full"></div>

        {/* 코 */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-3 h-3 bg-pink-400 rounded-full"></div>
      </div>

      {/* 로딩 텍스트 */}
      <div className="mt-6 flex space-x-1 text-lg font-semibold text-[#2d4739]">
        <span className="animate-bounce delay-0">L</span>
        <span className="animate-bounce delay-100">o</span>
        <span className="animate-bounce delay-200">a</span>
        <span className="animate-bounce delay-300">d</span>
        <span className="animate-bounce delay-400">i</span>
        <span className="animate-bounce delay-500">n</span>
        <span className="animate-bounce delay-600">g</span>
        <span className="animate-bounce delay-700">.</span>
        <span className="animate-bounce delay-800">.</span>
        <span className="animate-bounce delay-900">.</span>
      </div>
    </div>
  );
};

export default RabbitLoader;
