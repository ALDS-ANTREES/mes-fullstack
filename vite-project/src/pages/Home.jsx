import { useState, useEffect } from "react";
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

const data = [
  { name: "정상", value: 90 },
  { name: "불량", value: 10 },
];
const COLORS = ["#6c7cf6", "#f17676"];

const monthlyDefectData = [
  { name: "1월", 불량률: 4.0 },
  { name: "2월", 불량률: 3.0 },
  { name: "3월", 불량률: 5.0 },
  { name: "4월", 불량률: 4.5 },
  { name: "5월", 불량률: 3.5 },
  { name: "6월", 불량률: 2.8 },
];

const dailyDefectData = [
  { name: "6/1", 불량률: 3.2 },
  { name: "6/2", 불량률: 3.8 },
  { name: "6/3", 불량률: 2.5 },
  { name: "6/4", 불량률: 4.1 },
  { name: "6/5", 불량률: 3.9 },
  { name: "6/6", 불량률: 2.8 },
  { name: "6/7", 불량률: 3.1 },
];

const Home = () => {
  const [inspectionData, setInspectionData] = useState([]);
  const [itemCounter, setItemCounter] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      const newStatus = Math.random() < 0.95 ? "통과" : "불량"; // 95% pass rate
      const newItem = { id: itemCounter, status: newStatus };

      setInspectionData((prevData) => [newItem, ...prevData.slice(0, 8)]); // Keep last 6 items
      setItemCounter((prevCounter) => prevCounter + 1);
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [itemCounter]);

  return (
    <div className="bg-gray-200 fixed inset-0 grid grid-rows-2 gap-3 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#535cb5] rounded-xl flex justify-center items-center flex-col p-10">
          <div className="flex items-center gap-10">
            <div className="w-40 h-40">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                <path
                  fill="#ffffff"
                  d="M416 224C398.3 224 384 209.7 384 192C384 174.3 398.3 160 416 160L576 160C593.7 160 608 174.3 608 192L608 352C608 369.7 593.7 384 576 384C558.3 384 544 369.7 544 352L544 269.3L374.6 438.7C362.1 451.2 341.8 451.2 329.3 438.7L224 333.3L86.6 470.6C74.1 483.1 53.8 483.1 41.3 470.6C28.8 458.1 28.8 437.8 41.3 425.3L201.3 265.3C213.8 252.8 234.1 252.8 246.6 265.3L352 370.7L498.7 224L416 224z"
                />
              </svg>
            </div>
            <span className="text-white text-[8rem] font-bold">53.6%</span>
          </div>
          <div className="text-white text-[4rem] font-bold">
            일 생산 실적 달성율(%)
          </div>
          <div className="bg-[#4a54b2] text-whte mx-auto mt-5 text-white text-3xl p-5 font-bold">
            3,450 / 6,210 ea
          </div>
        </div>
        <div className="bg-white rounded-xl justify-center flex flex-col p-10">
          <div className="text-3xl font-bold">생산 라인 불량 비율</div>
          <ResponsiveContainer
            width="100%"
            height="100%"
            className="pointer-events-none"
          >
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend
                formatter={(value, entry) => {
                  const { payload } = entry;
                  const total = data.reduce((acc, curr) => acc + curr.value, 0);
                  const percent = ((payload.value / total) * 100).toFixed(0);
                  return `${value} ${percent}%`;
                }}
                wrapperStyle={{
                  fontSize: "2rem",
                  display: "flex",
                  justifyContent: "center",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 flex flex-col">
          <h3 className="text-xl font-bold mb-4">월별 불량률 실적</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyDefectData}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="불량률" fill="#f17676" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-4 flex flex-col">
          <h3 className="text-xl font-bold mb-4">일별 불량률 실적</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailyDefectData}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="불량률"
                stroke="#f17676"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-4 flex flex-col">
          <h3 className="text-xl font-bold mb-4">실시간 불량 검사 현황</h3>
          <div className="flex-grow overflow-y-auto">
            <div className="flex flex-col gap-2">
              {inspectionData.map((item) => (
                <div
                  key={item.id}
                  className={`flex justify-between p-2 rounded-md ${
                    item.status === "통과" ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  <span>{item.id}번째 품목</span>
                  <span
                    className={`font-bold ${
                      item.status === "통과" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {item.status}
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
