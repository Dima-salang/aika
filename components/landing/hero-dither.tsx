"use client";

import React, { useEffect, useRef } from "react";

export function HeroDither() {
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

      float getBayerValue(vec2 p) {
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

      float liquidPattern(vec2 p, float time) {
        float v1 = sin(p.x * 2.2 + time * 1.2);
        float v2 = sin(p.y * 1.8 + time * 1.0);
        float v3 = sin((p.x + p.y) * 1.5 + time * 0.8);
        float v4 = sin(length(p) * 2.0 - time * 0.6);
        return (v1 + v2 + v3 + v4) / 4.0 * 0.5 + 0.5;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 8.0 - vec2(4.0);
        p.x *= u_resolution.x / u_resolution.y;

        p.y += sin(p.x * 1.5 + u_time * 1.2) * 0.4;
        p.x += cos(p.y * 1.2 + u_time * 1.0) * 0.3;

        float intensity = liquidPattern(p, u_time);

        vec2 pixelCoord = floor(gl_FragCoord.xy / 2.5);
        float threshold = getBayerValue(pixelCoord);

        float activeState = intensity > threshold ? 1.0 : 0.0;

        vec3 deepBlack = vec3(0.047, 0.039, 0.035);
        vec3 pastelYellow = vec3(0.92, 0.91, 0.67);

        vec3 finalColor = mix(deepBlack, pastelYellow, activeState);
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
      const time = (Date.now() - startTime) * 0.001;

      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.047, 0.039, 0.035, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(timeUniformLocation, time);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

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
