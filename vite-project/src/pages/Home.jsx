import { useState, useEffect, useMemo, useRef } from "react";
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

const COLORS = ["#6c7cf6", "#f17676"];

const Home = () => {
  const [defects, setDefects] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, normalCount: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [videoStream, setVideoStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
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

  // 웹캠 스트림 초기화
  useEffect(() => {
    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "environment", // 후면 카메라 우선
          },
        });

        setVideoStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("웹캠 접근 오류:", error);
        setCameraError(
          error.name === "NotAllowedError"
            ? "웹캠 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요."
            : error.name === "NotFoundError"
            ? "웹캠을 찾을 수 없습니다. 웹캠이 연결되어 있는지 확인해주세요."
            : "웹캠에 접근할 수 없습니다."
        );
      }
    };

    startCamera();

    // 컴포넌트 언마운트 시 스트림 정리
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

  const handleItemClick = (image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
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

        {/* 실시간 검사 화면 (웹캠) */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl col-span-1 lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold">실시간 검사 화면</h3>
            {videoStream && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">LIVE</span>
              </div>
            )}
          </div>
          <div className="relative h-[350px] rounded-lg overflow-hidden bg-black">
            {cameraError ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-sm mb-2">{cameraError}</div>
                  <button
                    onClick={async () => {
                      try {
                        setCameraError(null);
                        const stream = await navigator.mediaDevices.getUserMedia({
                          video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            facingMode: "environment",
                          },
                        });
                        setVideoStream(stream);
                        if (videoRef.current) {
                          videoRef.current.srcObject = stream;
                        }
                      } catch (error) {
                        setCameraError("웹캠에 접근할 수 없습니다.");
                      }
                    }}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    다시 시도
                  </button>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            {/* 오버레이 정보 */}
            {videoStream && !cameraError && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="text-white text-sm font-semibold">
                  실시간 검사 중
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
                  className={`flex justify-between p-3 rounded-lg cursor-pointer ${
                    item.defective ? "bg-red-500/50" : "bg-green-500/50"
                  }`}
                  onClick={() => handleItemClick(item.image)}
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

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black flex justify-center items-center z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative bg-gray-800 p-4 rounded-lg max-w-3xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Defect"
              className="max-w-full max-h-[80vh] rounded-lg"
            />
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-full"
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
