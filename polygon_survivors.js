import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Texture, Material, Scene,
} = tiny;

const MAX_X = 10;
const MIN_X = -10;
const MAX_Y = 10
const MIN_Y = -10
const PROJ_Z = 1

const projectile_transforms = [];

function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateUnitVector(pos1, pos2) {
    // Calculate vector components
    const deltaX = pos2.x - pos1.x;
    const deltaY = pos2.y - pos1.y;

    // Calculate magnitude
    const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Calculate unit vector components
    const unitX = deltaX / magnitude;
    const unitY = deltaY / magnitude;

    // Return the unit vector as an object
    return { x: unitX, y: unitY };
}

export class Polygon_Survivors extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.dir = "";
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            cube: new defs.Cube(),
            sphere: new defs.Subdivision_Sphere(4),
            player: new defs.Subdivision_Sphere(4),
        };

        const textured = new defs.Textured_Phong(1);

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            player: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ff0000")}),
            grass: new Material(textured, {ambient: 1, texture: new Texture("assets/grass.png")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 30), vec3(0, 0, 0), vec3(0, 1, 0));
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


    update_projectile_locations() {
        projectile_transforms.forEach((element, index) => {
            let proj_x = element[0][3];
            let proj_y = element[1][3];

            const proj_coords = { x: proj_x, y: proj_y };
            const target_coords = { x: this.player_transform[0][3], y: this.player_transform[1][3] };
            const unitVec = calculateUnitVector(proj_coords, target_coords);

            // Update the original element in the array
            projectile_transforms[index] = element.times(Mat4.translation(unitVec.x / 100, unitVec.y / 100, 0));
        });
    }

    generate_projectiles(context, program_state, model_transform, t) {
        let count = t / 2 + 1;
        if (count > projectile_transforms.length) {
            let proj_transform = Mat4.identity();
            let edge = count % 4;
            if (edge < 1) {
                console.log("case 0");
                proj_transform = proj_transform.times(Mat4.translation(MAX_X, getRandomInteger(MIN_Y, MAX_Y), PROJ_Z));
            } else if (edge < 2) {
                console.log("case 1");
                proj_transform = proj_transform.times(Mat4.translation(getRandomInteger(MIN_X, MAX_X), MAX_Y, PROJ_Z));
            } else if (edge < 3) {
                console.log("case 2");
                proj_transform = proj_transform.times(Mat4.translation(MIN_X, getRandomInteger(MIN_Y, MAX_Y), PROJ_Z));
            } else {
                console.log("case 3");
                proj_transform = proj_transform.times(Mat4.translation(getRandomInteger(MIN_X, MAX_X), MIN_Y, PROJ_Z));
            }
            projectile_transforms.push(proj_transform);
        }
        projectile_transforms.forEach(element => {
            this.shapes.sphere.draw(context, program_state, element, this.materials.test);
        });
        this.update_projectile_locations();
    }


    set_initial_background(context, program_state, model_transform){


        model_transform = model_transform.times(Mat4.translation(0,0,-1))
            .times(Mat4.scale(50,50,0.1));
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.grass);

        return model_transform;
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

        const light_position = vec4(0, 0, 50, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const yellow = hex_color("#fac91a");
        let model_transform = Mat4.identity();

        this.shapes.torus.draw(context, program_state, model_transform, this.materials.test.override({color: yellow}));


        model_transform = this.set_initial_background(context, program_state, model_transform);

        this.player_transform = this.draw_player(context, program_state, this.player_transform);

        this.generate_projectiles(context, program_state, model_transform, t);
    }
}

