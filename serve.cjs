// @ts-check
const {spawn} = require("child_process");

/**
 * 
 * @param {string} cmd 
 * @param {string[]} args 
 * @returns {ReturnType<typeof spawn>}
 */
const run = (cmd, args = []) => {
	const spawn_opts = { "shell": true };
	console.log("CMD:", cmd, args.flat(), spawn_opts);
	const p = spawn(cmd, args.flat(), spawn_opts);
	p.stdout?.on("data", data => process.stdout.write(data));
	p.stderr?.on("data", data => process.stderr.write(data));
	p.on("close", code => {
		if (code !== 0)
			console.error(cmd, args, "exited with", code);
	});
	return p;
}

run("http-server", ["-p", "3000", "-a", "0.0.0.0", "-c-1", "-d", "false", "-s"]);
