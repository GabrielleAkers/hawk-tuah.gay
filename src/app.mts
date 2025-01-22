import { m4, createProgramInfo, setBuffersAndAttributes, setUniforms, drawBufferInfo, createBufferInfoFromArrays, createTexture } from "twgl.js";

const gl_canvas = document.getElementById("gl_canvas") as HTMLCanvasElement | null;
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

const monitor_screen_canvas = document.createElement("canvas");
monitor_screen_canvas.width = gl_canvas.width;
monitor_screen_canvas.height = gl_canvas.height;
const monitor_ctx = monitor_screen_canvas.getContext("2d");
if (!monitor_ctx) throw new Error("no ctx >.> idk vro");

const screen_left = 100;
const screen_top = 100;
const screen_right = monitor_screen_canvas.width - 100;
const screen_bottom = monitor_screen_canvas.height - 100;
const screen_height = monitor_screen_canvas.height - 200;
const screen_width = monitor_screen_canvas.width - 200;

let draw_screen_img: Function | null = null;
let screen_cursor_pos: [number, number] | [null, null] = [null, null];
let draw_screen_cursor: Function | null = null;
const screen_components: Record<string, Function> = {
    taskbar: () => {
        monitor_ctx.save();
        // draw taskbar base
        monitor_ctx.beginPath();
        monitor_ctx.fillStyle = "#225AD9";
        monitor_ctx.fillRect(screen_left, screen_bottom - (screen_height * 0.05), screen_width, screen_height * 0.05);
        monitor_ctx.closePath();
        monitor_ctx.restore();

        // draw highlights
        monitor_ctx.save();
        monitor_ctx.beginPath();
        // upper white highlight
        monitor_ctx.moveTo(screen_left, screen_bottom - (screen_height * 0.05));
        monitor_ctx.lineTo(screen_width, screen_bottom - (screen_height * 0.05));
        monitor_ctx.shadowBlur = 2;
        monitor_ctx.shadowColor = "white";
        monitor_ctx.shadowOffsetY = 2;
        monitor_ctx.strokeStyle = "#225AD9";
        monitor_ctx.stroke();
        monitor_ctx.closePath();
        // lower dark highlight
        monitor_ctx.beginPath();
        monitor_ctx.moveTo(screen_left, screen_bottom);
        monitor_ctx.lineTo(screen_width, screen_bottom);
        monitor_ctx.shadowBlur = 1;
        monitor_ctx.shadowColor = "gray";
        monitor_ctx.shadowOffsetY = -1;
        monitor_ctx.strokeStyle = "white";
        monitor_ctx.stroke();
        monitor_ctx.restore();

        monitor_ctx.save();
        // draw start button
        monitor_ctx.beginPath();
        monitor_ctx.fillStyle = "#3BA83B";
        monitor_ctx.fillRect(screen_left, screen_bottom - (screen_height * 0.05), screen_width * 0.1, screen_height * 0.05);
        monitor_ctx.closePath();
        // draw start button chip
        monitor_ctx.beginPath();
        monitor_ctx.fillStyle = "#3BA83B";
        monitor_ctx.moveTo(screen_left + screen_width * 0.1, screen_bottom - (screen_height * 0.05));
        monitor_ctx.arcTo(
            screen_left + screen_width * 0.125,
            screen_bottom - (screen_height * 0.025),
            screen_left + screen_width * 0.1,
            screen_bottom,
            screen_width * 0.025
        );
        monitor_ctx.lineTo(screen_left + screen_width * 0.1, screen_bottom);
        monitor_ctx.fill();
        monitor_ctx.strokeStyle = "#1F4BA8";
        monitor_ctx.stroke();
        monitor_ctx.shadowColor = "white";
        monitor_ctx.shadowBlur = 10;
        monitor_ctx.shadowOffsetX = 1;
        monitor_ctx.closePath();
        monitor_ctx.restore();

        // start button highlight
        // top light
        monitor_ctx.save();
        monitor_ctx.beginPath();
        monitor_ctx.moveTo(screen_left, screen_bottom - (screen_height * 0.05));
        monitor_ctx.lineTo(screen_left + screen_width * 0.1, screen_bottom - (screen_height * 0.05));
        monitor_ctx.shadowBlur = 2;
        monitor_ctx.shadowColor = "white";
        monitor_ctx.shadowOffsetY = 2;
        monitor_ctx.strokeStyle = "#3BA83B";
        monitor_ctx.stroke();
        monitor_ctx.closePath();
        // left light
        monitor_ctx.beginPath();
        monitor_ctx.moveTo(screen_left, screen_bottom - (screen_height * 0.05));
        monitor_ctx.lineTo(screen_left, screen_bottom - (screen_height * 0.025));
        monitor_ctx.shadowBlur = 2;
        monitor_ctx.shadowColor = "white";
        monitor_ctx.shadowOffsetX = 2;
        monitor_ctx.strokeStyle = "#3BA83B";
        monitor_ctx.stroke();
        monitor_ctx.closePath();
        // bottom dark
        monitor_ctx.beginPath();
        monitor_ctx.moveTo(screen_left, screen_bottom);
        monitor_ctx.lineTo(screen_left + screen_width * 0.1, screen_bottom);
        monitor_ctx.shadowBlur = 1;
        monitor_ctx.shadowColor = "gray";
        monitor_ctx.shadowOffsetY = -1;
        monitor_ctx.strokeStyle = "#3BA83B";
        monitor_ctx.stroke();
        monitor_ctx.closePath();
        monitor_ctx.restore();

        monitor_ctx.save();
        // start button text
        monitor_ctx.font = "italic 36px Franklin Gothic";
        monitor_ctx.fillStyle = "#FFFFFF";
        monitor_ctx.shadowColor = "black";
        monitor_ctx.shadowBlur = 7;
        monitor_ctx.shadowOffsetY = 2;
        monitor_ctx.shadowOffsetX = 2;
        monitor_ctx.fillText("start", screen_left + (screen_width * 0.1) * 0.3, screen_bottom - (screen_height * 0.015));
        monitor_ctx.restore();


        monitor_ctx.save();
        // draw system tray
        monitor_ctx.beginPath();
        monitor_ctx.fillStyle = "#1286E2";
        monitor_ctx.fillRect(
            screen_right - (screen_width * 0.125),
            screen_bottom - (screen_height * 0.05),
            screen_width * 0.125, screen_height * 0.05
        );
        // separator vertical line
        monitor_ctx.moveTo(screen_right - (screen_width * 0.125), screen_bottom - (screen_height * 0.05));
        monitor_ctx.lineTo(screen_right - (screen_width * 0.125), screen_bottom);
        monitor_ctx.stroke();
        monitor_ctx.closePath();

        // top light
        monitor_ctx.beginPath();
        monitor_ctx.moveTo(screen_right - (screen_width * 0.125), screen_bottom - (screen_height * 0.05));
        monitor_ctx.lineTo(screen_right, screen_bottom - (screen_height * 0.05));
        monitor_ctx.strokeStyle = "#1286E2";
        monitor_ctx.shadowBlur = 2;
        monitor_ctx.shadowColor = "white";
        monitor_ctx.shadowOffsetY = 2;
        monitor_ctx.stroke();
        monitor_ctx.closePath();
        // left light
        monitor_ctx.beginPath();
        monitor_ctx.moveTo(screen_right - (screen_width * 0.125), screen_bottom - (screen_height * 0.05));
        monitor_ctx.lineTo(screen_right - (screen_width * 0.125), screen_bottom);
        monitor_ctx.strokeStyle = "#1286E2";
        monitor_ctx.shadowBlur = 2;
        monitor_ctx.shadowColor = "white";
        monitor_ctx.shadowOffsetX = 2;
        monitor_ctx.stroke();
        monitor_ctx.closePath();
        // bottom dark
        monitor_ctx.beginPath();
        monitor_ctx.moveTo(screen_right - (screen_width * 0.125), screen_bottom);
        monitor_ctx.lineTo(screen_right, screen_bottom);
        monitor_ctx.strokeStyle = "#1286E2";
        monitor_ctx.shadowBlur = 1;
        monitor_ctx.shadowColor = "gray";
        monitor_ctx.shadowOffsetY = -1;
        monitor_ctx.stroke();
        monitor_ctx.closePath();
        monitor_ctx.restore();
    }
};

const render = () => {
    if (!draw_screen_img) return;

    draw_screen_img();

    Object.entries(screen_components).forEach(kv => {
        if (typeof kv[1] === "function") {
            kv[1]();
        }
    });

    if (draw_screen_cursor) {
        draw_screen_cursor();
    }
    const tex = createTexture(gl, { src: monitor_screen_canvas });
    // render the opengl texture
    draw_image(tex, monitor_screen_canvas.width, monitor_screen_canvas.height, 0, 0, gl_canvas.width, gl_canvas.height);
};

const screen_img = new Image();
screen_img.src = "assets/monitor.png";
screen_img.onload = () => {
    // draw to the canvas and render all the buttons and stuff then pass it through the shaders and re-render
    draw_screen_img = () => monitor_ctx.drawImage(screen_img, 0, 0, screen_img.width, screen_img.height, 0, 0, monitor_screen_canvas.width, monitor_screen_canvas.height);
    render();
};
screen_img.onerror = console.error;

const screen_cursor_img = new Image();
screen_cursor_img.src = "assets/default_arrow.cur";
screen_cursor_img.onload = () => {
    draw_screen_cursor = () => {
        if (screen_cursor_pos[0] !== null && screen_cursor_pos[1] !== null) {
            monitor_ctx.save();
            monitor_ctx.shadowBlur = 2;
            monitor_ctx.shadowColor = "black";
            monitor_ctx.shadowOffsetX = 2;
            monitor_ctx.shadowOffsetY = 2;
            monitor_ctx.drawImage(screen_cursor_img, screen_cursor_pos[0], screen_cursor_pos[1]);
            monitor_ctx.restore();
        }
    };
};

const get_canvas_rel_mouse_pos = (evt: MouseEvent, target: HTMLCanvasElement) => {
    target = target || evt.target;
    const rect = target.getBoundingClientRect();
    const pos = {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };

    pos.x = pos.x * target.width / target.clientWidth;
    pos.y = pos.y * target.height / target.clientHeight;
    return pos;
};

window.addEventListener("mousemove", evt => {
    const pos = get_canvas_rel_mouse_pos(evt, gl_canvas);
    if (pos.x > screen_left - 12 && pos.x < screen_right - 15 && pos.y > screen_top - 12 && pos.y < screen_bottom - 32) {
        screen_cursor_pos = [pos.x, pos.y];
        render();
    }
    else
        screen_cursor_pos = [null, null];
});

gl_canvas.onmouseleave = () => {
    screen_cursor_pos = [null, null];
    render();
};
