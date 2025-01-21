import { m4, createProgramInfo, setBuffersAndAttributes, setUniforms, drawBufferInfo, createBufferInfoFromArrays, createTexture } from "twgl.js";

const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
if (!canvas) throw new Error("No canvas found");
const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WEBGL BROKEN!!!!!!!!!!!!!!!!!!!!!!!!!!!!! :((");

const vs = `
attribute vec4 a_position;
attribute vec2 a_texcoord;
 
uniform mat4 u_matrix;
 
varying vec2 v_texcoord;
 
void main() {
   gl_Position = u_matrix * a_position;
   v_texcoord = a_texcoord;
}
`;

const fs = `
precision mediump float;
     
varying vec2 v_texcoord;
 
uniform sampler2D u_texture;
 
void main() {
   gl_FragColor = texture2D(u_texture, v_texcoord);
}
`;

const program_info = createProgramInfo(gl, [vs, fs]);

const arrays = {
    a_position: {
        numComponents: 2,
        data: [
            0, 0,
            0, 1,
            1, 0,
            1, 0,
            0, 1,
            1, 1,
        ],
    },
    a_texcoord: {
        numComponents: 2,
        data: [
            0, 0,
            0, 1,
            1, 0,
            1, 0,
            0, 1,
            1, 1,
        ],
    },
};

const buffer_info = createBufferInfoFromArrays(gl, arrays);

const draw_image = (tex: WebGLTexture, tex_width: number, tex_height: number, dest_x: number, dest_y: number, dest_width: number, dest_height: number) => {
    if (dest_width === undefined)
        dest_width = tex_width;
    if (dest_height === undefined)
        dest_height = tex_height;

    gl.useProgram(program_info.program);

    setBuffersAndAttributes(gl, program_info, buffer_info);

    let mat = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
    mat = m4.translate(mat, [dest_x, dest_y, 0]);
    mat = m4.scale(mat, [dest_width, dest_height, 1]);

    const uniforms = {
        u_texture: tex,
        u_matrix: mat
    };
    setUniforms(program_info, uniforms);
    drawBufferInfo(gl, buffer_info, gl.TRIANGLES);
};

const img = new Image();
img.src = "assets/bliss.jpg";
img.onload = () => {
    const tex = createTexture(gl, { src: img });

    draw_image(tex, img.width, img.height, 0, 0, canvas.width, canvas.height);
};
img.onerror = console.error;
