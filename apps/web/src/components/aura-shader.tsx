import { MeshGradient } from "@paper-design/shaders-react";
export default function AuraShader() {
  return (
    <MeshGradient
      style={{ width: "100%", height: "100%" }}
      colors={["#fdf9fc", "#e5d9ff", "#f9cce1", "#f8f4ff"]}
      speed={0.18}
      distortion={0.7}
      swirl={0.35}
    />
  );
}
