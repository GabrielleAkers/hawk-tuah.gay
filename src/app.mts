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
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
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

gl.useProgram(program_info.program);
setBuffersAndAttributes(gl, program_info, buffer_info);

const draw_image = (tex: WebGLTexture, tex_width: number, tex_height: number, dest_x: number, dest_y: number, dest_width: number, dest_height: number) => {
    if (dest_width === undefined)
        dest_width = tex_width;
    if (dest_height === undefined)
        dest_height = tex_height;

    // convert the quad to clip space :)
    let mat = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
    mat = m4.translate(mat, [dest_x, dest_y, 0]);
    mat = m4.scale(mat, [dest_width, dest_height, 1]);

    const uniforms = {
        u_texture: tex,
        u_matrix: mat,
        u_barrel_power: 1.4,
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

let current_date = new Date();

type Clickable = {
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    start_color: string,
    current_color: string,
    on_mousedown: Function,
    on_mouseup: Function,
    on_dblclick?: Function,
    render: (color?: string) => void,
};
const clickables: Record<string, Clickable> = {};
const register_clickable = (name: string, obj: Clickable) => {
    if (clickables[name] === undefined)
        clickables[name] = obj;
};

type Icon = {
    text: string,
    render_art: (x: number, y: number) => void;
    render_text: (x: number, y: number) => void;
    link_behavior: () => void;
};
const icons: Record<string, Icon> = {};
const register_icon = (name: string, obj: Icon) => {
    if (icons[name] === undefined)
        icons[name] = obj;
};
const icon_images: Record<string, HTMLImageElement> = {};

icon_images["github_icon"] = new Image();
icon_images["github_icon"].src = "assets/github_icon.png";
icon_images["github_icon"].onerror = console.error;

let draw_screen_img: Function | null = null;
let screen_cursor_pos: [number, number] | [null, null] = [null, null];
let draw_screen_cursor: Function | null = null;
const screen_components: Record<string, Function> = {
    taskbar: () => {
        // draw taskbar base
        monitor_ctx.save();
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

        const start_btn_color = "#3BA83B";
        const start_btn_mousedown_color = "#266B26";
        const start_btn_mouseup_color = "#3BA83B";
        register_clickable("start_btn", {
            x0: screen_left,
            y0: screen_bottom - (screen_height * 0.05),
            x1: screen_left + screen_width * 0.125,
            y1: screen_bottom,
            start_color: start_btn_color,
            current_color: start_btn_color,
            render: color => {
                monitor_ctx.save();
                monitor_ctx.beginPath();
                monitor_ctx.fillStyle = color || clickables["start_btn"].current_color;
                monitor_ctx.fillRect(screen_left, screen_bottom - (screen_height * 0.05), screen_width * 0.1, screen_height * 0.05);
                monitor_ctx.closePath();
                // draw start button chip
                monitor_ctx.beginPath();
                monitor_ctx.fillStyle = color || clickables["start_btn"].current_color;
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
                // top light
                monitor_ctx.save();
                monitor_ctx.beginPath();
                monitor_ctx.moveTo(screen_left, screen_bottom - (screen_height * 0.05));
                monitor_ctx.lineTo(screen_left + screen_width * 0.1, screen_bottom - (screen_height * 0.05));
                monitor_ctx.shadowBlur = 2;
                monitor_ctx.shadowColor = "white";
                monitor_ctx.shadowOffsetY = 2;
                monitor_ctx.strokeStyle = color || clickables["start_btn"].current_color;
                monitor_ctx.stroke();
                monitor_ctx.closePath();
                // left light
                monitor_ctx.beginPath();
                monitor_ctx.moveTo(screen_left, screen_bottom - (screen_height * 0.05));
                monitor_ctx.lineTo(screen_left, screen_bottom - (screen_height * 0.025));
                monitor_ctx.shadowBlur = 2;
                monitor_ctx.shadowColor = "white";
                monitor_ctx.shadowOffsetX = 2;
                monitor_ctx.strokeStyle = color || clickables["start_btn"].current_color;
                monitor_ctx.stroke();
                monitor_ctx.closePath();
                // bottom dark
                monitor_ctx.beginPath();
                monitor_ctx.moveTo(screen_left, screen_bottom);
                monitor_ctx.lineTo(screen_left + screen_width * 0.1, screen_bottom);
                monitor_ctx.shadowBlur = 1;
                monitor_ctx.shadowColor = "gray";
                monitor_ctx.shadowOffsetY = -1;
                monitor_ctx.strokeStyle = color || clickables["start_btn"].current_color;
                monitor_ctx.stroke();
                monitor_ctx.closePath();
                monitor_ctx.restore();

                monitor_ctx.save();
                // start button text
                monitor_ctx.font = "italic 28pt Franklin Gothic";
                monitor_ctx.fillStyle = "#FFFFFF";
                monitor_ctx.shadowColor = "black";
                monitor_ctx.shadowBlur = 7;
                monitor_ctx.shadowOffsetY = 2;
                monitor_ctx.shadowOffsetX = 2;
                monitor_ctx.fillText("start", screen_left + (screen_width * 0.1) * 0.3, screen_bottom - (screen_height * 0.015));
                monitor_ctx.restore();
            },
            on_mousedown: () => {
                clickables["start_btn"].current_color = start_btn_mousedown_color;
                clickables["start_btn"].render();
            },
            on_mouseup: () => {
                clickables["start_btn"].current_color = start_btn_mouseup_color;
                clickables["start_btn"].render();
            }
        });
        clickables["start_btn"].render();

        monitor_ctx.save();
        // draw system tray
        monitor_ctx.beginPath();
        monitor_ctx.fillStyle = "#1286E2";
        monitor_ctx.fillRect(
            screen_right - (screen_width * 0.125),
            screen_bottom - (screen_height * 0.05),
            screen_width * 0.125, screen_height * 0.05
        );
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
        // separator vertical line
        monitor_ctx.beginPath();
        monitor_ctx.moveTo(screen_right - (screen_width * 0.125), screen_bottom - (screen_height * 0.05));
        monitor_ctx.lineTo(screen_right - (screen_width * 0.125), screen_bottom);
        monitor_ctx.strokeStyle = "2px black";
        monitor_ctx.stroke();
        monitor_ctx.closePath();
        monitor_ctx.restore();
        // write the time
        monitor_ctx.save();
        monitor_ctx.fillStyle = "white";
        monitor_ctx.font = "18pt Segoe UI";
        monitor_ctx.fillText(current_date.toLocaleTimeString(undefined, { timeStyle: "short" }), screen_right - (screen_width * 0.125) * 0.7, screen_bottom - (screen_height * 0.016));
        monitor_ctx.restore();
    },
    icon_space: () => {
        const icon_spacing = 4;
        const icon_footprint = screen_height * 0.1;
        const icon_size = icon_footprint - 2 * icon_spacing;
        const max_icons_col = Math.floor(screen_height / icon_footprint);

        register_icon("github_icon", {
            text: "Github!",
            render_art: (x, y) => {
                monitor_ctx.drawImage(icon_images["github_icon"], x, y, 2 * icon_size / 3, 2 * icon_size / 3);
            },
            render_text: (x, y) => {
                monitor_ctx.save();
                monitor_ctx.fillStyle = "white";
                monitor_ctx.font = "20px Segoe UI";
                monitor_ctx.shadowBlur = 1;
                monitor_ctx.shadowOffsetY = 1;
                monitor_ctx.shadowColor = "black";
                monitor_ctx.fillText("GitHub!", x, y, icon_size);
                monitor_ctx.restore();
            },
            link_behavior: () => {
                location.href = "https://github.com/GabrielleAkers/hawk-tuah.gay";
            }
        });

        let icons_col = 0;
        Object.entries(icons).forEach((kv, i) => {
            icons_col = Math.floor(i / max_icons_col);
            const [x0, y0, x1, y1] = [
                screen_left + (icons_col + 1) * icon_spacing + (icons_col) * icon_size,
                screen_top + (i % max_icons_col + 1) * icon_spacing + (i % max_icons_col) * icon_size,
                screen_left + ((icons_col + 1) * icon_spacing + (icons_col) * icon_size) + icon_size,
                screen_top + ((i % max_icons_col + 1) * icon_spacing + (i % max_icons_col) * icon_size) + icon_size
            ];
            register_clickable(kv[0], {
                x0,
                y0: y0 - 16,
                x1,
                y1: y1 - 32,
                start_color: "rgba(255, 255, 255, 0)",
                current_color: "rgba(0, 0, 255, 0)",
                render: color => {
                    kv[1].render_art(x0 + icon_size / 8, y0);
                    kv[1].render_text(x0 + monitor_ctx.measureText(kv[1].text).width / 4, y0 + 2 * icon_size / 3 + 16);
                    monitor_ctx.save();
                    monitor_ctx.beginPath();
                    monitor_ctx.fillStyle = clickables[kv[0]].current_color;
                    monitor_ctx.fillRect(x0, y0 - 8, icon_size, icon_size);
                    monitor_ctx.restore();
                },
                on_mousedown: () => { },
                on_mouseup: () => {
                    clickables[kv[0]].current_color = "rgba(0, 0, 255, 0.5)";
                    clickables[kv[0]].render();
                },
                on_dblclick: () => {
                    kv[1].link_behavior();
                }
            });
            clickables[kv[0]].render();
        });
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

let last_clicked = "";

window.addEventListener("mousedown", evt => {
    const pos = get_canvas_rel_mouse_pos(evt, gl_canvas);
    Object.entries(clickables).forEach(kv => {
        if (pos.x > kv[1].x0 - 12 && pos.x < kv[1].x1 - 31 && pos.y > kv[1].y0 - 12 && pos.y < kv[1].y1) {
            last_clicked = kv[0];
            kv[1].on_mousedown();
            render();
        }
    });
});

window.addEventListener("mouseup", evt => {
    const pos = get_canvas_rel_mouse_pos(evt, gl_canvas);
    Object.entries(clickables).forEach(kv => {
        if (pos.x > kv[1].x0 && pos.x < kv[1].x1 && pos.y > kv[1].y0 && pos.y < kv[1].y1) {
            if (last_clicked === kv[0]) {
                kv[1].on_mouseup();
            }
        }
        if (last_clicked !== kv[0])
            kv[1].current_color = kv[1].start_color;
        kv[1].render();
        render();
    });
    last_clicked = "";
});

window.addEventListener("dblclick", evt => {
    const pos = get_canvas_rel_mouse_pos(evt, gl_canvas);
    Object.entries(clickables).forEach(kv => {
        if (pos.x > kv[1].x0 && pos.x < kv[1].x1 && pos.y > kv[1].y0 && pos.y < kv[1].y1) {
            if (kv[1].on_dblclick)
                kv[1].on_dblclick();
        }
        render();
    });
});

// update the date every second so it can be rendered into the juice
setInterval(() => {
    const d = new Date();
    if (d.getMinutes() !== current_date.getMinutes()) {
        current_date = new Date();
        render();
    }
}, 1000);

