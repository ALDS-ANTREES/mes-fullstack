import { useState } from "react";
import { useForm } from "react-hook-form";
import signUpApi from "../apis/member/signUpApi";
import { Link, useNavigate } from "react-router-dom";

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ mode: "onSubmit" });

  const password = watch("password");

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const res = await signUpApi(data);
      alert(res.message);
      console.log(res);
      navigate("/sign-in");
    } catch (err) {
      console.error("회원가입 실패:", err);
      alert("회원가입에 실패했습니다. 다른 아이디를 사용해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl w-full max-w-md">
        <h4 className="text-4xl font-bold text-center mb-8 text-white">
          회원가입
        </h4>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* 아이디 입력 필드 */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="아이디"
              autoComplete="username"
              className="w-full py-3 pl-12 pr-4 bg-white/20 text-white placeholder-gray-300 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              {...register("username", { required: "아이디를 입력하세요." })}
            />
          </div>
          {errors.username && (
            <p className="text-yellow-300 text-sm -mt-4">
              {errors.username.message}
            </p>
          )}

          {/* 비밀번호 입력 필드 */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </span>
            <input
              type="password"
              placeholder="비밀번호"
              autoComplete="new-password"
              className="w-full py-3 pl-12 pr-4 bg-white/20 text-white placeholder-gray-300 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              {...register("password", {
                required: "비밀번호를 입력하세요.",
                minLength: { value: 6, message: "6자 이상 입력하세요." },
              })}
            />
          </div>
          {errors.password && (
            <p className="text-yellow-300 text-sm -mt-4">
              {errors.password.message}
            </p>
          )}

          {/* 비밀번호 확인 필드 */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <input
              type="password"
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              className="w-full py-3 pl-12 pr-4 bg-white/20 text-white placeholder-gray-300 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              {...register("confirmPassword", {
                required: "비밀번호를 다시 입력하세요.",
                validate: (value) =>
                  value === password || "비밀번호가 일치하지 않습니다.",
              })}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-yellow-300 text-sm -mt-4">
              {errors.confirmPassword.message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out disabled:bg-indigo-400/50 flex items-center justify-center"
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "회원가입"
            )}
          </button>
        </form>
        <p className="text-center text-gray-300 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link
            to="/sign-in"
            className="font-semibold text-indigo-300 hover:text-indigo-200 transition"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
