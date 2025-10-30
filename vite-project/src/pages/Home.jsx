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
import startSendingDefectData from "../apis/defect/sendDefectData";
import clearDefectsApi from "../apis/defect/clearDefectsApi";

const COLORS = ["#6c7cf6", "#f17676"];

const Home = () => {
  const [defects, setDefects] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, normalCount: 0 });
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
    startSendingDefectData();
    fetchData();
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
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

  const totalInspected = defects.length;
  const defectiveCount = defects.filter((d) => d.defective).length;
  const normalCountInBatch = totalInspected - defectiveCount;

  const achievementRate = (stats.normalCount / totalTarget) * 100;

  const pieData = [
    { name: "정상", value: normalCountInBatch },
    { name: "불량", value: defectiveCount },
  ];

  const currentMonth = new Date().getMonth(); // 0-11

  // Memoize the data for the past 5 months so it doesn't change on re-render
  const pastMonthsData = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      const monthName = `${monthIndex + 1}월`;
      const rate = Math.random() * 10 + 15; // Random rate between 15 and 25
      return {
        name: monthName,
        불량률: parseFloat(rate.toFixed(1)),
      };
    });
  }, []); // Empty dependency array means this runs only once

  // Calculate current month's data on every render
  const currentRate =
    totalInspected > 0 ? (defectiveCount / totalInspected) * 100 : 0;
  const currentMonthData = {
    name: `${currentMonth + 1}월`,
    불량률: parseFloat(currentRate.toFixed(1)),
  };

  // Combine the stable past data with the dynamic current month data
  const monthlyDefectData = [...pastMonthsData, currentMonthData];

  // New logic for "최근 불량률 추이" (Recent Defect Rate Trend)
  const trendDataPoints = 6; // Show 6 data points (60 seconds)
  const intervalSeconds = 10; // Each point represents 10 seconds
  const now = new Date();

  const recentTrendData = Array.from({ length: trendDataPoints }, (_, i) => {
    const secondsAgoEnd = i * intervalSeconds;
    const secondsAgoStart = (i + 1) * intervalSeconds;

    const end = new Date(now.getTime() - secondsAgoEnd * 1000);
    const start = new Date(now.getTime() - secondsAgoStart * 1000);

    // Filter defects that fall into this time bucket
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
  }).reverse(); // Reverse to show oldest on the left, newest on the right

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">생산 현황 대시보드</h1>
        <button
          onClick={handleClearData}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          데이터 초기화
        </button>
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
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl col-span-1 lg:col-span-2">
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
              {defects
                .slice()
                .map((item) => (
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

