import {defs, tiny} from './examples/common.js';
import {Player, Enemy} from './entity.js';
import {Shape_From_File} from "./examples/obj-file-demo.js";
import {getRandomInteger, calculateUnitVector, scale_velocity} from "./util.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Texture, Material, Scene,
} = tiny;

const MAX_X = 20;
const MIN_X = -20;
const MAX_Y = 20
const MIN_Y = -20
const PROJ_Z = 1

const enemies = [];

export class Polygon_Survivors extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.dir = "";

        this.player = new Player(100, 0, Mat4.identity(), [0,0], 0.08);

        this.player_polys = {
            model: new Shape_From_File("./assets/amogus.obj"),
            head: new defs.Subdivision_Sphere(4),
            body: new defs.Cube(),
        }

        this.enemy_polys = {
            head: new defs.Subdivision_Sphere(4),
            body: new defs.Cube(),
        }

        this.sword_stats = {
            damage: 10,
            rotation_speed: 5,
            length: 2,
        }

        this.weapon_polys = {
            sword: new Shape_From_File("./assets/sword/obj"),
            rect: new defs.Cube(),
        }

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
            enemy: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .6, color: hex_color("#485246")}),
            player: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, color: hex_color("#9c1010")}),
            sword: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, specularity: 1, color: hex_color("#919191")}),
            grass: new Material(textured, {ambient: 1, texture: new Texture("assets/grass.png")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 30), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        this.key_triggered_button("left", ["j"], function () {
            this.player.velocity[0] = -1;
        }, "#ff0000", function () {
            this.player.velocity[0] = 0;
        });
        this.key_triggered_button("right", ["l"], function () {
            this.player.velocity[0] = 1;
        }, "#ff0000", function () {
            this.player.velocity[0] = 0;
        });
        this.key_triggered_button("up", ["i"], function () {
            this.player.velocity[1] = 1;
        }, "#ff0000", function () {
            this.player.velocity[1] = 0;
        });
        this.key_triggered_button("down", ["k"], function () {
            this.player.velocity[1] = -1;
        }, "#ff0000", function () {
            this.player.velocity[1] = 0;
        });

    }

    draw_player(context, program_state, model_transform){
        let new_velocity = scale_velocity(this.player.velocity, this.player.speed);
        //console.log(new_velocity[0], new_velocity[1]);

        let player_transform = model_transform.times(Mat4.translation(new_velocity[0], new_velocity[1], 0));// Draw the player (sphere)
        //this.player_polys.model.draw(context, program_state, player_transform, this.materials.player);

        let head_transform = player_transform.times(Mat4.translation(0, 0, 2))
            .times(Mat4.scale(1, 1, 1)); // Adjust scale as needed
        this.player_polys.head.draw(context, program_state, head_transform, this.materials.player);

        // Draw the body (cube)
        let body_transform = player_transform.times(Mat4.translation(0, 0, 0))
            .times(Mat4.scale(1, 1, 1.5)); // Adjust scale as needed
        this.player_polys.body.draw(context, program_state, body_transform, this.materials.player);

        return player_transform;
    }

    draw_sword(context, program_state, model_transform, t){
        let mod_time = t % this.sword_stats.rotation_speed;
        let angle = 2*Math.PI*mod_time/this.sword_stats.rotation_speed;
        let sword_transform1 = model_transform.times(Mat4.rotation(angle, 0, 0, 1))
            .times(Mat4.translation(4, 0, 0))
            .times(Mat4.scale(this.sword_stats.length,0.2,0.2));

        let sword_transform2 = model_transform.times(Mat4.rotation(angle, 0, 0, 1))
            .times(Mat4.translation(-4, 0, 0))
            .times(Mat4.scale(this.sword_stats.length,0.2,0.2));

        this.weapon_polys.rect.draw(context, program_state, sword_transform1, this.materials.sword);
        this.weapon_polys.rect.draw(context, program_state, sword_transform2, this.materials.sword);

    }

    check_collision(player_transform, projectile_transform) {
        // Get the positions of the player and projectile
        const player_position = vec3(player_transform[0][3], player_transform[1][3], player_transform[2][3]);
        const projectile_position = vec3(projectile_transform[0][3], projectile_transform[1][3], projectile_transform[2][3]);

        // Define the radii of the spheres for collision detection
        const player_radius = 1.0; // Adjust as needed
        const projectile_radius = 0.5; // Adjust as needed

        // Calculate the distance between the centers of the spheres
        const distance = Math.sqrt(
            Math.pow(player_position[0] - projectile_position[0], 2) +
            Math.pow(player_position[1] - projectile_position[1], 2) +
            Math.pow(player_position[2] - projectile_position[2], 2)
        );

        // Check if there is a collision
        const collision = distance < (player_radius + projectile_radius);

        return collision;
    }

    update_enemy_locations() {
        enemies.forEach((element, index) => {
            let enemy_transform = element.transform;
            let proj_x = enemy_transform[0][3];
            let proj_y = enemy_transform[1][3];

            const proj_coords = { x: proj_x, y: proj_y };
            const target_coords = { x: this.player.transform[0][3], y: this.player.transform[1][3] };
            const unitVec = calculateUnitVector(proj_coords, target_coords);

            // Calculate the angle between the enemy and the player
            const angle = Math.atan2(unitVec.y, unitVec.x);

            // Check if the enemy is already facing the player
            const currentAngle = Math.atan2(enemy_transform[1][0], enemy_transform[0][0]);

            // Calculate the difference in angles
            const angleDifference = angle - currentAngle;

            // Update the original element in the array with the rotated enemy
            element.transform = enemy_transform
                .times(Mat4.rotation(angleDifference, 0, 0, 1))
                .times(Mat4.translation(0.01, 0.01, 0));

            if (this.check_collision(this.player.transform, element.transform)) {
                // Handle player death (you can customize this part)
                this.player.takeDamage(10);
                console.log("Player took 10 damage! Health: " + this.player.health);
                // For example, reset the player's position
                //this.player_transform = Mat4.identity();
            }
        });
    }

    generate_enemies(context, program_state, model_transform, t) {
        let count = t / 2 + 1;
        if (count > enemies.length) {
            let proj_transform = Mat4.identity();
            let edge = count % 4;
            if (edge < 1) {
                console.log("case 0");
                proj_transform = proj_transform.times(Mat4.translation(this.player.transform[0][3] + MAX_X, this.player.transform[1][3] + getRandomInteger(MIN_Y, MAX_Y), PROJ_Z));
            } else if (edge < 2) {
                console.log("case 1");
                proj_transform = proj_transform.times(Mat4.translation(this.player.transform[0][3] + getRandomInteger(MIN_X, MAX_X), this.player.transform[1][3] + MAX_Y, PROJ_Z));
            } else if (edge < 3) {
                console.log("case 2");
                proj_transform = proj_transform.times(Mat4.translation(this.player.transform[0][3] + MIN_X, this.player.transform[1][3] + getRandomInteger(MIN_Y, MAX_Y), PROJ_Z));
            } else {
                console.log("case 3");
                proj_transform = proj_transform.times(Mat4.translation(this.player.transform[0][3] + getRandomInteger(MIN_X, MAX_X), this.player.transform[1][3] + MIN_Y, PROJ_Z));
            }
            enemies.push(new Enemy(100, proj_transform));
        }

        enemies.forEach(element => {
            // Draw the head (sphere)
            let enemy_transform = element.transform;
            let head_transform = enemy_transform.times(Mat4.translation(0, 0, 2))
                .times(Mat4.scale(1, 1, 1)); // Adjust scale as needed
            this.enemy_polys.head.draw(context, program_state, head_transform, this.materials.enemy);

            // Draw the body (cube)
            let body_transform = enemy_transform.times(Mat4.translation(0, 0, 0))
                .times(Mat4.scale(1, 1, 1.5)); // Adjust scale as needed
            this.enemy_polys.body.draw(context, program_state, body_transform, this.materials.enemy);
        });

        this.update_enemy_locations();
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

        model_transform = this.set_initial_background(context, program_state, model_transform);

        //move player based on keypress
        this.player.transform = this.draw_player(context, program_state, this.player.transform);

        //draw swords around player
        this.draw_sword(context, program_state, this.player.transform, t)

        //generate and draw enemies
        this.generate_enemies(context, program_state, model_transform, t);
    }
}

