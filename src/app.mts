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
        gl_FragColor = texture2D(u_texture, d);
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
        u_barrel_power: 1.3,
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
    is_showing: boolean;
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

icon_images["game_info_icon"] = new Image();
icon_images["game_info_icon"].src = "assets/game_info_icon.png";
icon_images["game_info_icon"].onerror = console.error;

icon_images["wow_logo_icon"] = new Image();
icon_images["wow_logo_icon"].src = "assets/wow_logo_icon.png";
icon_images["wow_logo_icon"].onerror = console.error;

let draw_screen_img: Function | null = null;
let screen_cursor_pos: [number, number] | [null, null] = [null, null];
let draw_screen_cursor: Function | null = null;

let game_server_info: { info: { name: string, game: string, players: number, maxPlayers: number; }, players: { playerCount: number, players: { name: string; }[]; }; } | null = null;
let game_info_showing = false;

let create_wow_acc_showing = false;
let focused_wow_acc_form_input: null | "user" | "pass" = null;
const signup_form_state = { user: "", pass: "" };
let signup_form_status = "";

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
            is_showing: true,
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

        register_icon("game_info_icon", {
            text: "GameServer",
            render_art: (x, y) => {
                monitor_ctx.drawImage(icon_images["game_info_icon"], x, y, 2 * icon_size / 3, 2 * icon_size / 3);
            },
            render_text: (x, y) => {
                monitor_ctx.save();
                monitor_ctx.fillStyle = "white";
                monitor_ctx.font = "20px Segoe UI";
                monitor_ctx.shadowBlur = 1;
                monitor_ctx.shadowOffsetY = 1;
                monitor_ctx.shadowColor = "black";
                monitor_ctx.fillText("GameServer", x - 14, y, icon_size);
                monitor_ctx.restore();
            },
            link_behavior: async () => {
                game_info_showing = true;
                game_server_info = await ((await fetch("https://games.hawk-tuah.gay:25555/status?game=wow")).json());
            }
        });

        register_icon("wow_logo_icon", {
            text: "WoW",
            render_art: (x, y) => {
                monitor_ctx.drawImage(icon_images["wow_logo_icon"], x, y, 2 * icon_size / 3, 2 * icon_size / 3);
            },
            render_text: (x, y) => {
                monitor_ctx.save();
                monitor_ctx.fillStyle = "white";
                monitor_ctx.font = "20px Segoe UI";
                monitor_ctx.shadowBlur = 1;
                monitor_ctx.shadowOffsetY = 1;
                monitor_ctx.shadowColor = "black";
                monitor_ctx.fillText("Wow Signup", x - 5, y, icon_size);
                monitor_ctx.restore();
            },
            link_behavior: async () => {
                create_wow_acc_showing = true;
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
                is_showing: true,
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
    },
    server_info_window: () => {
        monitor_ctx.save();
        if (game_info_showing) {
            // top bar
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.fillStyle = "#225AD9";
            monitor_ctx.fillRect(screen_width / 3 + 2, screen_height / 3 + 2, screen_width / 3 - 2, screen_height * 0.05);
            monitor_ctx.closePath();
            monitor_ctx.restore();
            // draw highlights
            // upper white highlight
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.moveTo(screen_width / 3 + 2, screen_height / 3 + 2);
            monitor_ctx.lineTo(2 * screen_width / 3 - 2, screen_height / 3);
            monitor_ctx.shadowBlur = 2;
            monitor_ctx.shadowColor = "white";
            monitor_ctx.shadowOffsetY = 2;
            monitor_ctx.strokeStyle = "#225AD9";
            monitor_ctx.stroke();
            monitor_ctx.closePath();
            // lower white highlight
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.moveTo(screen_width / 3, screen_height / 3 + screen_height * 0.05 - 2);
            monitor_ctx.lineTo(2 * screen_width / 3, screen_height / 3 + screen_height * 0.05 - 2);
            monitor_ctx.shadowBlur = 4;
            monitor_ctx.shadowColor = "white";
            monitor_ctx.shadowOffsetY = 1;
            monitor_ctx.strokeStyle = "#225AD9";
            monitor_ctx.stroke();
            monitor_ctx.closePath();
            // lower dark highlight
            monitor_ctx.beginPath();
            monitor_ctx.moveTo(screen_width / 3, screen_height / 3 + screen_height * 0.05);
            monitor_ctx.lineTo(2 * screen_width / 3, screen_height / 3 + screen_height * 0.05);
            monitor_ctx.shadowBlur = 1;
            monitor_ctx.shadowColor = "gray";
            monitor_ctx.shadowOffsetY = -1;
            monitor_ctx.strokeStyle = "#225AD9";
            monitor_ctx.stroke();
            monitor_ctx.restore();

            // frame
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.strokeStyle = "#225AD9";
            monitor_ctx.roundRect(screen_width / 3, screen_height / 3, screen_width / 3, screen_height / 3, 10);
            monitor_ctx.stroke();
            monitor_ctx.closePath();
            monitor_ctx.restore();

            // frame label
            monitor_ctx.save();
            monitor_ctx.fillStyle = "white";
            monitor_ctx.font = "24pt Franklin Gothic";
            monitor_ctx.fillText("Currently playing :)", screen_width / 3 + 12, screen_height / 3 + screen_height * 0.035);
            monitor_ctx.restore();

            // close button
            register_clickable("close_info_window_btn", {
                is_showing: game_info_showing,
                x0: 2 * screen_width / 3 - 42,
                y0: screen_height / 3 + 6,
                x1: 2 * screen_width / 3 - 6,
                y1: screen_height / 3 + 42,
                current_color: "#FF0000",
                start_color: "#FF0000",
                render: color => {
                    const x = clickables["close_info_window_btn"].x0;
                    const y = clickables["close_info_window_btn"].y0;
                    const w = clickables["close_info_window_btn"].x1 - x;
                    const h = clickables["close_info_window_btn"].y1 - y;
                    monitor_ctx.save();
                    monitor_ctx.beginPath();
                    monitor_ctx.fillStyle = color || clickables["close_info_window_btn"].current_color;
                    monitor_ctx.strokeStyle = "white";
                    monitor_ctx.roundRect(x, y, w, h, 8);
                    monitor_ctx.fill();
                    monitor_ctx.stroke();
                    monitor_ctx.closePath();
                    monitor_ctx.beginPath();
                    monitor_ctx.moveTo(x + 6, y + 6);
                    monitor_ctx.lineTo(x + w - 6, y + h - 6);
                    monitor_ctx.strokeStyle = "white";
                    monitor_ctx.lineWidth = 4;
                    monitor_ctx.stroke();
                    monitor_ctx.closePath();
                    monitor_ctx.beginPath();
                    monitor_ctx.moveTo(x + w - 6, y + 6);
                    monitor_ctx.lineTo(x + 6, y + h - 6);
                    monitor_ctx.stroke();
                    monitor_ctx.closePath();
                    monitor_ctx.restore();
                },
                on_mousedown: () => {
                    if (game_info_showing) {
                        clickables["close_info_window_btn"].current_color = "#770000";
                        clickables["close_info_window_btn"].render();
                    }
                },
                on_mouseup: () => {
                    if (game_info_showing) {
                        game_info_showing = false;
                        clickables["close_info_window_btn"].current_color = clickables["close_info_window_btn"].start_color;
                        clickables["close_info_window_btn"].render();
                    }
                }
            });
            clickables["close_info_window_btn"].render();

            // text panel
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.fillStyle = "white";
            monitor_ctx.fillRect(screen_width / 3, screen_height / 3 + screen_height * 0.05, screen_width / 3, screen_height / 3);
            monitor_ctx.closePath();
            monitor_ctx.restore();

            const txt_x = screen_width / 3 + 12;
            const txt_y_base = screen_height / 3 + screen_height * 0.05 + 12;
            monitor_ctx.save();
            monitor_ctx.fillStyle = "black";
            monitor_ctx.font = "18pt Segoe UI";
            if (game_server_info && game_server_info["info"]) {
                monitor_ctx.fillText(`Game: ${game_server_info["info"]["game"]}`, txt_x, txt_y_base + 24);
                monitor_ctx.fillText(`Server Name: ${game_server_info["info"]["name"]}`, txt_x, txt_y_base + 60, screen_width / 3 - 24);
                monitor_ctx.fillText(`Players: ${game_server_info["info"]["players"]}/${game_server_info["info"]["maxPlayers"]}`, txt_x, txt_y_base + 96);
                if (game_server_info["players"]) {
                    monitor_ctx.beginPath();
                    monitor_ctx.moveTo(txt_x, txt_y_base + 108);
                    monitor_ctx.lineTo(2 * screen_width / 3 - 12, txt_y_base + 108);
                    monitor_ctx.strokeStyle = "gray";
                    monitor_ctx.stroke();
                    monitor_ctx.closePath();
                    const max_line_width = screen_width / 3 - 24;
                    monitor_ctx.fillStyle = "black";
                    monitor_ctx.font = "16pt Segoe UI";
                    const lines: string[] = [];
                    let line = "";
                    const tmp_players = game_server_info["players"]["players"];
                    game_server_info["players"]["players"].forEach((p, i) => {
                        if (monitor_ctx.measureText(line + `${p.name}`).width >= max_line_width) {
                            lines.push(line);
                            line = "";
                            tmp_players.splice(0, i);
                        }
                        line = line + `${p.name},`;
                    });
                    lines.push(tmp_players.map(p => p.name).join(","));
                    let line_y = txt_y_base + 132;

                    lines.forEach(l => {
                        monitor_ctx.fillText(l, txt_x, line_y, max_line_width);
                        line_y = line_y + 24;
                    });
                }
            } else {
                monitor_ctx.fillText("Loading game info....", txt_x, txt_y_base + 24);
            }
            monitor_ctx.restore();
        }
        monitor_ctx.restore();
    },
    create_wow_account_form_window: () => {
        monitor_ctx.save();
        if (create_wow_acc_showing) {
            // top bar
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.fillStyle = "#225AD9";
            monitor_ctx.fillRect(screen_width / 3 + 2, screen_height / 3 + 2, screen_width / 3 - 2, screen_height * 0.05);
            monitor_ctx.closePath();
            monitor_ctx.restore();
            // draw highlights
            // upper white highlight
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.moveTo(screen_width / 3 + 2, screen_height / 3 + 2);
            monitor_ctx.lineTo(2 * screen_width / 3 - 2, screen_height / 3);
            monitor_ctx.shadowBlur = 2;
            monitor_ctx.shadowColor = "white";
            monitor_ctx.shadowOffsetY = 2;
            monitor_ctx.strokeStyle = "#225AD9";
            monitor_ctx.stroke();
            monitor_ctx.closePath();
            // lower white highlight
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.moveTo(screen_width / 3, screen_height / 3 + screen_height * 0.05 - 2);
            monitor_ctx.lineTo(2 * screen_width / 3, screen_height / 3 + screen_height * 0.05 - 2);
            monitor_ctx.shadowBlur = 4;
            monitor_ctx.shadowColor = "white";
            monitor_ctx.shadowOffsetY = 1;
            monitor_ctx.strokeStyle = "#225AD9";
            monitor_ctx.stroke();
            monitor_ctx.closePath();
            // lower dark highlight
            monitor_ctx.beginPath();
            monitor_ctx.moveTo(screen_width / 3, screen_height / 3 + screen_height * 0.05);
            monitor_ctx.lineTo(2 * screen_width / 3, screen_height / 3 + screen_height * 0.05);
            monitor_ctx.shadowBlur = 1;
            monitor_ctx.shadowColor = "gray";
            monitor_ctx.shadowOffsetY = -1;
            monitor_ctx.strokeStyle = "#225AD9";
            monitor_ctx.stroke();
            monitor_ctx.restore();

            // frame
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.strokeStyle = "#225AD9";
            monitor_ctx.roundRect(screen_width / 3, screen_height / 3, screen_width / 3, screen_height / 3, 10);
            monitor_ctx.stroke();
            monitor_ctx.closePath();
            monitor_ctx.restore();

            // frame label
            monitor_ctx.save();
            monitor_ctx.fillStyle = "white";
            monitor_ctx.font = "24pt Franklin Gothic";
            monitor_ctx.fillText("TuahWoW Signup 🗿", screen_width / 3 + 12, screen_height / 3 + screen_height * 0.035);
            monitor_ctx.restore();

            // close button
            register_clickable("close_create_window_btn", {
                is_showing: create_wow_acc_showing,
                x0: 2 * screen_width / 3 - 42,
                y0: screen_height / 3 + 6,
                x1: 2 * screen_width / 3 - 6,
                y1: screen_height / 3 + 42,
                current_color: "#FF0000",
                start_color: "#FF0000",
                render: color => {
                    const x = clickables["close_create_window_btn"].x0;
                    const y = clickables["close_create_window_btn"].y0;
                    const w = clickables["close_create_window_btn"].x1 - x;
                    const h = clickables["close_create_window_btn"].y1 - y;
                    monitor_ctx.save();
                    monitor_ctx.beginPath();
                    monitor_ctx.fillStyle = color || clickables["close_create_window_btn"].current_color;
                    monitor_ctx.strokeStyle = "white";
                    monitor_ctx.roundRect(x, y, w, h, 8);
                    monitor_ctx.fill();
                    monitor_ctx.stroke();
                    monitor_ctx.closePath();
                    monitor_ctx.beginPath();
                    monitor_ctx.moveTo(x + 6, y + 6);
                    monitor_ctx.lineTo(x + w - 6, y + h - 6);
                    monitor_ctx.strokeStyle = "white";
                    monitor_ctx.lineWidth = 4;
                    monitor_ctx.stroke();
                    monitor_ctx.closePath();
                    monitor_ctx.beginPath();
                    monitor_ctx.moveTo(x + w - 6, y + 6);
                    monitor_ctx.lineTo(x + 6, y + h - 6);
                    monitor_ctx.stroke();
                    monitor_ctx.closePath();
                    monitor_ctx.restore();
                },
                on_mousedown: () => {
                    if (create_wow_acc_showing) {
                        clickables["close_create_window_btn"].current_color = "#770000";
                        clickables["close_create_window_btn"].render();
                    }
                },
                on_mouseup: () => {
                    if (create_wow_acc_showing) {
                        create_wow_acc_showing = false;
                        focused_wow_acc_form_input = null;
                        signup_form_state.pass = "";
                        signup_form_state.user = "";
                        signup_form_status = "";
                        clickables["close_create_window_btn"].current_color = clickables["close_create_window_btn"].start_color;
                        clickables["close_create_window_btn"].render();
                    }
                }
            });
            clickables["close_create_window_btn"].render();

            // text panel
            monitor_ctx.save();
            monitor_ctx.beginPath();
            monitor_ctx.fillStyle = "white";
            monitor_ctx.fillRect(screen_width / 3, screen_height / 3 + screen_height * 0.05, screen_width / 3, screen_height / 3);
            monitor_ctx.closePath();
            monitor_ctx.restore();

            const txt_x = screen_width / 3 + 12;
            const txt_y_base = screen_height / 3 + screen_height * 0.05 + 12;

            monitor_ctx.fillStyle = "black";
            monitor_ctx.font = "18pt Segoe UI";
            monitor_ctx.fillText(`Username:`, txt_x, txt_y_base + 24);
            register_clickable("create_wow_account_username_input", {
                is_showing: create_wow_acc_showing,
                x0: txt_x,
                y0: txt_y_base + 42,
                x1: txt_x + screen_width / 3 - 24,
                y1: txt_y_base + 74,
                render: color => {
                    const { x0, x1, y0, y1, start_color } = clickables["create_wow_account_username_input"];
                    monitor_ctx.save();
                    monitor_ctx.fillStyle = start_color;
                    monitor_ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
                    monitor_ctx.strokeStyle = focused_wow_acc_form_input === "user" ? "#3BA83B" : "black";
                    monitor_ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
                    monitor_ctx.fillStyle = "black";
                    monitor_ctx.font = "14pt Segoe UI";
                    monitor_ctx.fillText(signup_form_state.user, x0 + 16, y0 + 24);
                    monitor_ctx.restore();
                },
                start_color: "#F9F1F1",
                current_color: "#F9F1F1",
                on_mousedown: () => { },
                on_mouseup: () => {
                    if (create_wow_acc_showing) {
                        clickables["create_wow_account_username_input"].render();
                        focused_wow_acc_form_input = "user";
                    }
                }
            });
            clickables["create_wow_account_username_input"].render();

            monitor_ctx.fillStyle = "black";
            monitor_ctx.fillText(`Password:`, txt_x, txt_y_base + screen_height / 8 - 24, screen_width / 3 - 24);
            register_clickable("create_wow_account_password_input", {
                is_showing: create_wow_acc_showing,
                x0: txt_x,
                y0: txt_y_base + screen_height / 8,
                x1: txt_x + screen_width / 3 - 24,
                y1: txt_y_base + screen_height / 8 + 32,
                render: color => {
                    const { x0, x1, y0, y1, start_color } = clickables["create_wow_account_password_input"];
                    monitor_ctx.save();
                    monitor_ctx.fillStyle = start_color;
                    monitor_ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
                    monitor_ctx.strokeStyle = focused_wow_acc_form_input === "pass" ? "#3BA83B" : "black";
                    monitor_ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
                    monitor_ctx.fillStyle = "black";
                    monitor_ctx.font = "14pt Segoe UI";
                    monitor_ctx.fillText(signup_form_state.pass, x0 + 16, y0 + 24);
                    monitor_ctx.restore();
                },
                current_color: "#F9F1F1",
                start_color: "#F9F1F1",
                on_mousedown: () => { },
                on_mouseup: () => {
                    if (create_wow_acc_showing) {
                        clickables["create_wow_account_password_input"].render();
                        focused_wow_acc_form_input = "pass";
                    }
                }
            });
            clickables["create_wow_account_password_input"].render();

            register_clickable("create_wow_account_btn", {
                is_showing: create_wow_acc_showing,
                x0: txt_x + 128,
                y0: txt_y_base + screen_height / 6,
                x1: txt_x + screen_width / 3 - 96,
                y1: txt_y_base + screen_height / 6 + 32,
                current_color: "#3BA83B",
                start_color: "#3BA83B",
                render: color => {
                    const { x0, x1, y0, y1, current_color } = clickables["create_wow_account_btn"];
                    monitor_ctx.save();
                    monitor_ctx.fillStyle = color || current_color;
                    monitor_ctx.fillRect(x0, y0, x1 - x0, 32);
                    monitor_ctx.fillStyle = "white";
                    monitor_ctx.shadowBlur = 0;
                    monitor_ctx.font = "18pt Franklin Gothic";
                    monitor_ctx.fillText("Create", (x1 + x0) / 2 - 20, y1 - 8);
                    monitor_ctx.restore();
                },
                on_mousedown: () => {
                    if (create_wow_acc_showing) {
                        clickables["create_wow_account_btn"].current_color = "#266B26";
                        clickables["create_wow_account_btn"].render();
                    }
                },
                on_mouseup: async () => {
                    if (create_wow_acc_showing) {
                        clickables["create_wow_account_btn"].current_color = clickables["create_wow_account_btn"].start_color;
                        const res = await fetch("https://games.hawk-tuah.gay:25555/create_wow_account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signup_form_state) });
                        const res_data = await res.text();
                        if (res_data === "USER_PASS_LEN_ERR") {
                            signup_form_status = "User/pass can't be longer than 16 characters";
                        }
                        else if (res_data === "USER_SPEC_CHAR_ERR") {
                            signup_form_status = "Special characters not allowed in username";
                        }
                        else if (res.status !== 200) {
                            signup_form_status = res_data;
                        } else {
                            signup_form_status = "Account created!!!!!!! Poggers!\n Set realmlist.wtf to games.hawk-tuah.gay and have fun :)";
                        }
                        clickables["create_wow_account_btn"].render();
                    }
                }
            });
            clickables["create_wow_account_btn"].render();

            // help text
            monitor_ctx.fillStyle = "black";
            monitor_ctx.beginPath();
            monitor_ctx.moveTo(txt_x, 2 * screen_height / 3 - 64);
            monitor_ctx.lineTo(2 * screen_width / 3 - 12, 2 * screen_height / 3 - 64);
            monitor_ctx.strokeStyle = "gray";
            monitor_ctx.stroke();
            monitor_ctx.closePath();
            monitor_ctx.font = "14pt Segoe UI";
            const max_line_width = screen_width / 3 - 24;
            monitor_ctx.fillStyle = "black";
            monitor_ctx.font = "16pt Segoe UI";
            let lines: string[][] = [];
            let line_count = 0;
            let tmp_txt = signup_form_status.split(" ");
            lines[line_count] = [];
            for (let t = 0; t < tmp_txt.length; t++) {
                if (monitor_ctx.measureText(lines[line_count].join(" ")).width > max_line_width) {
                    let last_item = lines[line_count].pop();
                    line_count++;
                    lines[line_count] = [last_item ?? ""];
                }
                lines[line_count].push(tmp_txt[t]);
            }
            let line_y = 2 * screen_height / 3 - 32;

            lines.forEach(l => {
                monitor_ctx.fillText(l.join(" "), txt_x, line_y, max_line_width);
                line_y = line_y + 24;
            });
        }
        monitor_ctx.restore();
    }
};

const render = (ts: number) => {
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

    requestAnimationFrame(render);
};

const screen_img = new Image();
screen_img.src = "assets/monitor.png";
screen_img.onload = () => {
    // draw to the canvas and render all the buttons and stuff then pass it through the shaders and re-render
    draw_screen_img = () => monitor_ctx.drawImage(screen_img, 0, 0, screen_img.width, screen_img.height, 0, 0, monitor_screen_canvas.width, monitor_screen_canvas.height);
    render(0);
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
    }
    else
        screen_cursor_pos = [null, null];
});

let last_clicked = "";

const has_mouse = matchMedia("(pointer:fine)").matches;

const handle_mousedown = (evt: MouseEvent | PointerEvent) => {
    const pos = get_canvas_rel_mouse_pos(evt, gl_canvas);
    Object.entries(clickables).forEach(kv => {
        if (pos.x > kv[1].x0 - 12 && pos.x < kv[1].x1 - 12 && pos.y > kv[1].y0 - 12 && pos.y < kv[1].y1 - 16 && kv[1].is_showing) {
            last_clicked = kv[0];
            kv[1].on_mousedown();
        }
    });
};

const handle_mouseup = (evt: MouseEvent | PointerEvent) => {
    const pos = get_canvas_rel_mouse_pos(evt, gl_canvas);
    Object.entries(clickables).forEach(kv => {
        if (pos.x > kv[1].x0 - 12 && pos.x < kv[1].x1 - 12 && pos.y > kv[1].y0 - 12 && pos.y < kv[1].y1 - 16 && kv[1].is_showing) {
            if (last_clicked === kv[0]) {
                kv[1].on_mouseup();

            }
        }
        if (last_clicked !== kv[0])
            kv[1].current_color = kv[1].start_color;
        kv[1].render();
    });
    last_clicked = "";
};

const handle_dblclick = (evt: MouseEvent | PointerEvent) => {
    const pos = get_canvas_rel_mouse_pos(evt, gl_canvas);
    Object.entries(clickables).forEach(kv => {
        if (pos.x > kv[1].x0 && pos.x < kv[1].x1 && pos.y > kv[1].y0 && pos.y < kv[1].y1 && kv[1].is_showing) {
            if (kv[1].on_dblclick)
                kv[1].on_dblclick();
        }
    });
};

window.addEventListener(has_mouse ? "mousedown" : "pointerdown", handle_mousedown);

window.addEventListener(has_mouse ? "mouseup" : "pointerup", evt => {
    handle_mouseup(evt);
    setTimeout(() => handle_dblclick(evt), 50);
});

if (has_mouse)
    window.addEventListener("dblclick", handle_dblclick);

window.addEventListener("keyup", evt => {
    if (create_wow_acc_showing) {
        let editing_state;
        if (focused_wow_acc_form_input === "user") {
            editing_state = signup_form_state.user;
            switch (evt.key) {
                case "ArrowDown":
                    break;
                case "ArrowUp":
                    break;
                case "ArrowLeft":
                    break;
                case "ArrowRight":
                    break;
                case "Enter":
                    break;
                case " ":
                    break;
                case "Escape":
                    break;
                case "Shift":
                    break;
                case "Backspace":
                    editing_state = editing_state.slice(0, editing_state.length - 1);
                    break;
                default:
                    if (editing_state.length < 16 && /[aA-zZ0-9]{1}/.test(evt.key)) {
                        editing_state = editing_state + evt.key;
                    }
                    break;
            }
            signup_form_state.user = editing_state;
        }
        if (focused_wow_acc_form_input === "pass") {
            editing_state = signup_form_state.pass;
            switch (evt.key) {
                case "ArrowDown":
                    break;
                case "ArrowUp":
                    break;
                case "ArrowLeft":
                    break;
                case "ArrowRight":
                    break;
                case "Enter":
                    break;
                case " ":
                    break;
                case "Escape":
                    break;
                case "Shift":
                    break;
                case "Backspace":
                    editing_state = editing_state.slice(0, editing_state.length - 1);
                    break;
                default:
                    if (editing_state.length < 16) {
                        editing_state = editing_state + evt.key;
                    }
                    break;
            }
            signup_form_state.pass = editing_state;
        }
    }
});

// update the date every second so it can be rendered into the juice
setInterval(() => {
    const d = new Date();
    if (d.getMinutes() !== current_date.getMinutes()) {
        current_date = new Date();
    }
}, 1000);

requestAnimationFrame(render);
