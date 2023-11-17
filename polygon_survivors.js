import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class Polygon_Survivors extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.dir = "";
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            player: new defs.Subdivision_Sphere(4),
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            player: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ff0000")})
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 20), vec3(0, 0, 0), vec3(0, 1, 0));
        this.player_transform = Mat4.identity();
        this.velocity = [0,0];
    }

    make_control_panel() {
        this.key_triggered_button("left", ["j"], function () {
            this.velocity[0] = -0.05;
        }, "#ff0000", function () {
            this.velocity[0] = 0;
        });
        this.key_triggered_button("right", ["l"], function () {
            this.velocity[0] = 0.05;
        }, "#ff0000", function () {
            this.velocity[0] = 0;
        });
        this.key_triggered_button("up", ["i"], function () {
            this.velocity[1] = 0.05;
        }, "#ff0000", function () {
            this.velocity[1] = 0;
        });
        this.key_triggered_button("down", ["k"], function () {
            this.velocity[1] = -0.05;
        }, "#ff0000", function () {
            this.velocity[1] = 0;
        });

    }
    draw_player(context, program_state, model_transform){
        let player_transform = model_transform.times(Mat4.translation(this.velocity[0], this.velocity[1], 0));
        this.shapes.player.draw(context, program_state, player_transform, this.materials.player);
        return player_transform;
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const light_position = vec4(0, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const yellow = hex_color("#fac91a");
        let model_transform = Mat4.identity();

        this.shapes.torus.draw(context, program_state, model_transform, this.materials.test.override({color: yellow}));

        this.player_transform = this.draw_player(context, program_state, this.player_transform);
    }
}

