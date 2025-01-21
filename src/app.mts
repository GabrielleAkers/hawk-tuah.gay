import { m4, createProgramInfo, setBuffersAndAttributes, setUniforms, drawBufferInfo, createBufferInfoFromArrays, createTexture } from "twgl.js";

const gl_canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
if (!gl_canvas) throw new Error("No canvas found");
const gl = gl_canvas.getContext("webgl2");
if (!gl) {
    alert("YOURE BROWSER NOT SUPPORT WEBGL!!!!!!!!!!!!!!!!!!!!!!!!!!!! 😢😭");
    throw new Error("WEGBL BROKEN!!!!!!!");
}

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
uniform float u_barrel_power;

vec2 distort(vec2 p)
{
    float theta  = atan(p.y, p.x);
    float radius = length(p);
    radius = pow(radius, u_barrel_power);
    p.x = radius * cos(theta);
    p.y = radius * sin(theta);
    return 0.5 * (p + 1.0);
}
 
void main() {
    vec2 xy = 2.0 * v_texcoord - 1.0;
    vec2 d = distort(xy);
    if (d.x > 1.0 || d.x < 0.0 || d.y > 1.0 || d.y < 0.0)
    {
        gl_FragColor = vec4(0.125, 0.125, 0.125, 1.0);
    }
    else
    {
        gl_FragColor = texture2D(u_texture, distort(xy));
    }
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

    // convert the quad to clip space :)
    let mat = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
    mat = m4.translate(mat, [dest_x, dest_y, 0]);
    mat = m4.scale(mat, [dest_width, dest_height, 1]);

    const uniforms = {
        u_texture: tex,
        u_matrix: mat,
        u_barrel_power: 1.45,
    };
    setUniforms(program_info, uniforms);
    drawBufferInfo(gl, buffer_info, gl.TRIANGLES);
};

const canvas = document.createElement("canvas");
canvas.width = gl_canvas.width;
canvas.height = gl_canvas.height;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("no ctx >.> idk vro");

let draw_background_img: Function | null = null;
const screen_components: Record<string, Function> = {
    taskbar: () => {
        // draw taskbar base
        ctx.beginPath();
        ctx.fillStyle = "#225AD9";
        ctx.fillRect(0, canvas.height - (canvas.height * 0.05), canvas.width, canvas.height);
        ctx.closePath();

        // draw start button
        ctx.beginPath();
        ctx.fillStyle = "#3BA83B";
        ctx.fillRect(0, canvas.height - (canvas.height * 0.05), canvas.width * 0.1, canvas.height);
        ctx.closePath();
        // draw start button chip
        ctx.beginPath();
        ctx.fillStyle = "#3BA83B";
        ctx.moveTo(canvas.width * 0.1, canvas.height - (canvas.height * 0.05));
        ctx.arcTo(canvas.width * 0.125, canvas.height - (canvas.height * 0.025), canvas.width * 0.1, canvas.height, canvas.width * 0.03);
        ctx.lineTo(canvas.width * 0.1, canvas.height);
        ctx.fill();
        ctx.closePath();

        // draw system tray
        ctx.beginPath();
        ctx.fillStyle = "#1286E2";
        ctx.fillRect(canvas.width - (canvas.width * 0.125), canvas.height - (canvas.height * 0.05), canvas.width, canvas.height);
        ctx.closePath();
    }
};

const img = new Image();
const render = () => {
    if (!draw_background_img) return;

    draw_background_img();

    Object.entries(screen_components).forEach(kv => {
        if (typeof kv[1] === "function") {
            kv[1]();
        }
    });
    const tex = createTexture(gl, { src: canvas });
    // render the opengl texture
    draw_image(tex, img.width, img.height, 0, 0, gl_canvas.width, gl_canvas.height);
};



img.src = "assets/bliss.jpg";
img.onload = () => {
    // draw to the canvas and render all the buttons and stuff then pass it through the shaders and re-render
    draw_background_img = () => ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
    render();
};
img.onerror = console.error;
