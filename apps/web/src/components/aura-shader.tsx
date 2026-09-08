import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Ambient wash behind the keepsake. Lazy-loaded, and never mounted when the
 * visitor prefers reduced motion or the keepsake is at list size.
 */
export default function AuraShader() {
  return (
    <MeshGradient
      style={{ width: "100%", height: "100%" }}
      colors={["#fdfaff", "#e9e0f8", "#f9e3ec", "#f5effc"]}
      speed={0.14}
      distortion={0.65}
      swirl={0.32}
    />
  );
}
