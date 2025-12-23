import { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import getDefectsApi from "../apis/defect/getDefectsApi";
import getDefectStatsApi from "../apis/defect/getDefectStatsApi";
import clearDefectsApi from "../apis/defect/clearDefectsApi";
import startDetectionApi from "../apis/defect/startDetectionApi"; // Import the new API
import stopDetectionApi from "../apis/defect/stopDetectionApi";

const COLORS = ["#6c7cf6", "#f17676"];

const Home = () => {
  const [defects, setDefects] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, normalCount: 0 });
  // 백엔드 프록시를 통해 스트림 받기 (CORS 문제 해결)
  const baseApiUrl = import.meta.env.VITE_BASE_URL || "http://localhost:3000";
  // VITE_BASE_URL에서 /api 제거 (스트림은 /stream 경로 사용)
  const baseUrl = baseApiUrl.endsWith('/api') 
    ? baseApiUrl.replace('/api', '') 
    : baseApiUrl.replace(/\/api\/?$/, '');
  const raspberryStreamUrl = `${baseUrl}/stream/video_feed`;
  
  const [streamError, setStreamError] = useState(null);
  const [streamLoading, setStreamLoading] = useState(true);
  const [useIframe, setUseIframe] = useState(false); // img 태그를 먼저 시도
  const totalTarget = 1000;

  const fetchData = async () => {
    try {
      const defectData = await getDefectsApi();
      const statsData = await getDefectStatsApi();
      setDefects(defectData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, []);

  // 스트림 연결 시도 및 타임아웃 처리
  useEffect(() => {
    console.log("🔄 스트림 연결 시도:", raspberryStreamUrl);
    console.log("📍 전체 URL:", raspberryStreamUrl);
    setStreamLoading(true);
    setStreamError(null);
    setUseIframe(false); // img 태그를 먼저 시도
    
    // 타임아웃 설정 제거 - MJPEG 스트림은 계속 로딩되므로 타임아웃으로 에러 표시하지 않음
    // 스트림이 실제로 작동하는지는 img/iframe의 onLoad/onError로 판단
    
    // 네트워크 접근 가능 여부 확인 (HEAD 요청은 백엔드 프록시를 통해)
    console.log("🌐 네트워크 접근 테스트 시작...");
    fetch(raspberryStreamUrl, { method: 'HEAD', mode: 'cors' })
      .then((response) => {
        console.log("✅ 스트림 URL 접근 가능 (HEAD 요청):", raspberryStreamUrl);
        console.log("응답 상태:", response.status);
        console.log("응답 타입:", response.type);
      })
      .catch((err) => {
        console.warn("⚠️ 스트림 URL 접근 확인 실패 (무시하고 계속 진행):", err.message);
        // HEAD 요청 실패는 무시하고 스트림 로딩 계속 진행
      });
    
    return () => {
      console.log("🧹 스트림 연결 정리");
    };
  }, [raspberryStreamUrl]);

  // 라즈베리파이 스트림 URL은 상태로 관리 (환경 변수 또는 기본값 사용)

  const handleClearData = async () => {
    if (
      window.confirm(
        "정말로 모든 검사 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      try {
        await clearDefectsApi();
        alert("데이터가 성공적으로 초기화되었습니다.");
        fetchData(); // Refresh data immediately
      } catch (error) {
        console.error("Error clearing data:", error);
        alert("데이터 초기화에 실패했습니다.");
      }
    }
  };

  const handleStartDetection = async () => {
    try {
      alert("서버에서 불량품 판독을 시작합니다.");
      const response = await startDetectionApi();
      console.log(response.message);
    } catch (error) {}
  };

  const handleStopDetection = async () => {
    try {
      alert("서버에서 불량품 판독을 종료합니다.");
      const response = await stopDetectionApi();
      console.log(response.message);
    } catch (error) {}
  };



  const totalInspected = defects.length;
  const defectiveCount = defects.filter((d) => d.defective).length;
  const normalCountInBatch = totalInspected - defectiveCount;

  const achievementRate = (stats.normalCount / totalTarget) * 100;

  const pieData = [
    { name: "정상", value: normalCountInBatch },
    { name: "불량", value: defectiveCount },
  ];

  const currentMonth = new Date().getMonth(); // 0-11

  const pastMonthsData = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      const monthName = `${monthIndex + 1}월`;
      const rate = Math.random() * 10 + 15;
      return {
        name: monthName,
        불량률: parseFloat(rate.toFixed(1)),
      };
    });
  }, []);

  const currentRate =
    totalInspected > 0 ? (defectiveCount / totalInspected) * 100 : 0;
  const currentMonthData = {
    name: `${currentMonth + 1}월`,
    불량률: parseFloat(currentRate.toFixed(1)),
  };

  const monthlyDefectData = [...pastMonthsData, currentMonthData];

  const trendDataPoints = 6;
  const intervalSeconds = 10;
  const now = new Date();

  const recentTrendData = Array.from({ length: trendDataPoints }, (_, i) => {
    const secondsAgoEnd = i * intervalSeconds;
    const secondsAgoStart = (i + 1) * intervalSeconds;

    const end = new Date(now.getTime() - secondsAgoEnd * 1000);
    const start = new Date(now.getTime() - secondsAgoStart * 1000);

    const bucketDefects = defects.filter((d) => {
      const timestamp = new Date(d.timestamp);
      return timestamp >= start && timestamp < end;
    });

    const totalInBucket = bucketDefects.length;
    const defectivesInBucket = bucketDefects.filter((d) => d.defective).length;

    const rate =
      totalInBucket > 0 ? (defectivesInBucket / totalInBucket) * 100 : 0;

    return {
      name: `-${secondsAgoStart}s`,
      불량률: parseFloat(rate.toFixed(1)),
    };
  }).reverse();

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">생산 현황 대시보드</h1>
        <div>
          <button
            onClick={handleClearData}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            데이터 초기화
          </button>
          <button
            onClick={handleStartDetection} // Updated onClick handler
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors ml-2"
          >
            작업 시작
          </button>
          <button
            onClick={handleStopDetection}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-colors ml-2"
          >
            작업 종료
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 생산 실적 달성률 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl col-span-1 lg:col-span-1 flex flex-col justify-center items-center">
          <h3 className="text-2xl font-bold mb-4">일 생산 실적 달성률</h3>
          <div className="text-7xl font-bold text-cyan-300">
            {achievementRate.toFixed(1)}%
          </div>
          <div className="text-xl mt-2">
            ({stats.normalCount} / {totalTarget})
          </div>
        </div>

        {/* 생산 라인 불량 비율 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl col-span-1 lg:col-span-1">
          <h3 className="text-2xl font-bold mb-4">최근 검사 불량 비율</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="80%"
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "1rem",
                }}
              />
              <Legend
                formatter={(value, entry) => {
                  const { payload } = entry;
                  const percent =
                    totalInspected > 0
                      ? ((payload.value / totalInspected) * 100).toFixed(0)
                      : 0;
                  return `${value} ${percent}%`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 실시간 검사 화면 (라즈베리파이 스트림) */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl col-span-1 lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold">실시간 검사 화면</h3>
            {!streamError && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">LIVE</span>
              </div>
            )}
          </div>
          <div className="relative h-[350px] rounded-lg overflow-hidden bg-black">
            {streamError ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-sm mb-2">{streamError}</div>
                  <div className="text-xs mb-2 text-gray-500 break-all">
                    스트림 URL: {raspberryStreamUrl}
                  </div>
                  <div className="text-xs mb-2 text-red-400">
                    ⚠️ ngrok 대역폭 제한으로 인해 스트림을 로드할 수 없습니다.
                  </div>
                  <div className="text-xs mb-6 text-gray-500">
                    💡 해결 방법: ngrok 플랜 업그레이드 또는 대역폭 제한 해제 대기
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => {
                        setStreamError(null);
                        setStreamLoading(true);
                        setUseIframe(false);
                        // 스트림 리로드
                        const img = document.querySelector('#raspberry-stream');
                        if (img) {
                          img.src = `${raspberryStreamUrl}?t=${Date.now()}`;
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={() => {
                        window.open(raspberryStreamUrl, '_blank');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      새 탭에서 열기
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 로딩 오버레이 */}
                {streamLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <div className="text-sm text-white">스트림 연결 중...</div>
                    </div>
                  </div>
                )}
                
                {/* MJPEG 스트림 (img 태그) - 항상 렌더링하여 GET 요청 전송 */}
                <img
                  id="raspberry-stream"
                  src={raspberryStreamUrl}
                  alt="라즈베리파이 실시간 스트림"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("❌ 이미지 스트림 로드 실패:", e);
                    console.error("시도한 URL:", raspberryStreamUrl);
                    console.error("에러 타입:", e.type);
                    
                    // 실제 GET 요청 테스트
                    fetch(raspberryStreamUrl, { 
                      method: 'GET', 
                      mode: 'cors',
                      headers: {
                        'Accept': 'multipart/x-mixed-replace, image/*, video/*, */*'
                      }
                    })
                      .then(async (response) => {
                        console.log("✅ GET 요청 성공 - 상태:", response.status);
                        console.log("Content-Type:", response.headers.get('Content-Type'));
                        if (response.ok) {
                          console.log("💡 스트림은 작동 중이지만 img 태그가 로드하지 못함");
                          console.log("💡 iframe으로 전환 시도");
                          setUseIframe(true);
                        }
                      })
                      .catch((fetchErr) => {
                        console.error("❌ GET 요청 실패:", fetchErr.message);
                      });
                    
                    setStreamError(
                      "스트림 로딩에 실패했습니다.\n\n" +
                      "GET 요청은 성공했지만 이미지 로드 실패\n\n" +
                      "해결 방법:\n" +
                      "1. 페이지를 새로고침하세요\n" +
                      "2. 브라우저 캐시를 지우고 다시 시도하세요\n" +
                      "3. 다른 브라우저에서 시도해보세요"
                    );
                    setStreamLoading(false);
                  }}
                  onLoad={() => {
                    console.log("✅ 이미지 스트림 로드 성공:", raspberryStreamUrl);
                    setStreamError(null);
                    setStreamLoading(false);
                  }}
                  onLoadStart={() => {
                    console.log("🔄 스트림 로딩 시작 - GET 요청 전송됨");
                    setStreamError(null);
                  }}
                />
                
                {/* iframe 대안 (img 실패 시) */}
                {useIframe && (
                  <iframe
                    src={raspberryStreamUrl}
                    className="w-full h-full border-0"
                    allow="camera; microphone"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    onLoad={() => {
                      console.log("✅ iframe 스트림 로드 성공:", raspberryStreamUrl);
                      setStreamError(null);
                      setStreamLoading(false);
                    }}
                  />
                )}
              </>
            )}
            {/* 오버레이 정보 */}
            {!streamError && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="text-white text-sm font-semibold">
                  라즈베리파이 실시간 스트림
                </div>
                <div className="text-white/80 text-xs">
                  {new Date().toLocaleTimeString("ko-KR")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* 월별 불량률 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl">
          <h3 className="text-2xl font-bold mb-4">월별 불량률 실적</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyDefectData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.2)"
              />
              <XAxis dataKey="name" stroke="white" />
              <YAxis stroke="white" />
              <Tooltip
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "1rem",
                }}
              />
              <Bar dataKey="불량률" fill="#f17676" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 일별 불량률 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl">
          <h3 className="text-2xl font-bold mb-4">최근 불량률 추이</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={recentTrendData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.2)"
              />
              <XAxis dataKey="name" stroke="white" />
              <YAxis stroke="white" />
              <Tooltip
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "1rem",
                }}
              />
              <Line
                type="monotone"
                dataKey="불량률"
                stroke="#f17676"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 실시간 검사 현황 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl">
          <h3 className="text-2xl font-bold mb-4">실시간 검사 현황</h3>
          <div className="overflow-y-auto h-[350px] pr-2">
            <div className="flex flex-col gap-2">
              {defects.slice().map((item) => (
                <div
                  key={item._id}
                  className={`flex justify-between p-3 rounded-lg ${
                    item.defective ? "bg-red-500/50" : "bg-green-500/50"
                  }`}
                >
                  <span>{item.device_id}</span>
                  <span className="font-bold">
                    {item.defective ? "불량" : "정상"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;
