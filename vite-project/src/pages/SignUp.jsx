import { useState } from "react";
import { useForm } from "react-hook-form";
import signUpApi from "../apis/member/signUpApi";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: "onSubmit" });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const res = await signUpApi(data);
      alert(res.message);
      console.log(res);
      navigate("/");
    } catch (err) {
      console.error("회원가입 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-box" onSubmit={handleSubmit(onSubmit)}>
      <h4>회원가입</h4>

      <input
        type="text"
        placeholder="아이디"
        autoComplete="username"
        {...register("username", { required: "아이디를 입력하세요." })}
      />
      {errors.username && (
        <p className="error-text">{errors.username.message}</p>
      )}

      <input
        type="password"
        placeholder="비밀번호"
        autoComplete="new-password"
        {...register("password", {
          required: "비밀번호를 입력하세요.",
          minLength: { value: 6, message: "6자 이상 입력하세요." },
        })}
      />
      {errors.password && (
        <p className="error-text">{errors.password.message}</p>
      )}

      <button type="submit" disabled={loading}>
        {loading ? "전송 중..." : "제출"}
      </button>
    </form>
  );
};

export default SignUp;
