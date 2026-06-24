"use client";

import React, { useEffect, useRef } from "react";

export function WorkflowDither() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_dark;

      // Simple pseudo-random hash for stippling noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      // 4x4 Bayer matrix lookup
      float getBayer4x4(vec2 p) {
        int x = int(mod(p.x, 4.0));
        int y = int(mod(p.y, 4.0));
        int idx = y * 4 + x;
        
        float m[16];
        m[0] = 0.0;  m[1] = 8.0;  m[2] = 2.0;  m[3] = 10.0;
        m[4] = 12.0; m[5] = 4.0;  m[6] = 14.0; m[7] = 6.0;
        m[8] = 3.0;  m[9] = 11.0; m[10]= 1.0;  m[11]= 9.0;
        m[12]= 15.0; m[13]= 7.0;  m[14]= 13.0; m[15]= 5.0;
        
        for (int i = 0; i < 16; i++) {
          if (i == idx) return m[i] / 16.0;
        }
        return 0.0;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // Microscopic pixel-perfect 4x4 Bayer dither (1.0 grid size)
        vec2 ditherCoord = floor(gl_FragCoord.xy / 1.0);
        float threshold = getBayer4x4(ditherCoord);

        // Gradient bleeding in from the top-right corner, breathing slowly
        vec2 lightSource = vec2(1.0, 1.0);
        float dist = distance(uv, lightSource);
        
        // Slow auric pulse
        float pulse = sin(u_time * 0.8) * 0.03;
        float intensity = smoothstep(1.2 + pulse, 0.15, dist) * 0.42;

        // Subtle atmospheric stipple noise
        float noise = hash(ditherCoord + vec2(floor(u_time * 6.0)));
        intensity += (noise - 0.5) * 0.06;

        // High-contrast Bayer check
        float activeState = intensity > threshold ? 1.0 : 0.0;

        vec3 bg;
        vec3 accent;
        if (u_dark > 0.5) {
          bg = vec3(0.008, 0.006, 0.006); // Void Black
          accent = vec3(0.92, 0.91, 0.85); // Silver Gold
        } else {
          bg = vec3(0.98, 0.98, 0.98); // Off-White
          accent = vec3(0.62, 0.60, 0.52); // Soft Silver-Gold/Bronze
        }

        vec3 finalColor = mix(bg, accent, activeState);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const positionAttributeLocation = gl.getAttribLocation(program, "position");
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");
    const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    const darkUniformLocation = gl.getUniformLocation(program, "u_dark");

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    let animationId: number;
    let startTime = Date.now();

    const render = () => {
      const time = (Date.now() - startTime) * 0.0003; // Radiate slowly

      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        gl.clearColor(0.008, 0.006, 0.006, 1.0);
      } else {
        gl.clearColor(0.98, 0.98, 0.98, 1.0);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(timeUniformLocation, time);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
      gl.uniform1f(darkUniformLocation, isDark ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-cover opacity-90 transition-opacity duration-500"
    />
  );
}
