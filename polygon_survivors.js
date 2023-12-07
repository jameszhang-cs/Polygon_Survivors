import {defs, tiny} from './examples/common.js';
import {Player, Enemy, Projectile} from './entity.js';
import {Shape_From_File} from "./examples/obj-file-demo.js";
import {getRandomInteger, calculateUnitVector, scale_velocity,
    sword_collision, gen_sword_points} from "./util.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Texture, Material, Scene,
} = tiny;

const MAX_X = 20;
const MIN_X = -20;
const MAX_Y = 20
const MIN_Y = -20
const PROJ_Z = 1
const MAX_HEALTH = 100

let enemies = [];

let edge = 0;

let orbs = [];
let lasers_left = [];
let lasers_right = [];

let levelup_opts = [];

export class Polygon_Survivors extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.dir = "";

        this.mousex;
        this.mousey;

        this.orb_itnum = 0;
        this.orb_neg = -1;

        this.start_screen = true;

        this.player = new Player(MAX_HEALTH, 0, Mat4.identity(), [0,0], 0.08);
        this.levelup_state = false;

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
            damage: 1,
            rotation_speed: 1,
            length: 2,
        }
        this.laser_stats = {
            damage: 10,
            length: 1.5,
        }


        this.weapon_polys = {
            sword: new Shape_From_File("./assets/sword.obj"),
            rect: new defs.Cube(),
            circle: new defs.Subdivision_Sphere(4),
        }

        this.sword_transform1 = Mat4.identity();
        this.sword_transform2 = Mat4.identity();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            box: new defs.Cube(),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(50,50),
            square: new defs.Square(),

            field: new defs.Square(),
            healthbar: new defs.Cube(),
            levelup_menu: new defs.Cube(),


        };

        const textured = new defs.Textured_Phong(1);

        // *** Materials
        this.materials = {
            healthbar: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .6, color: hex_color("#00ef04")}),
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            enemy: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .6, color: hex_color("#334d5e")}),
            player: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, color: hex_color("#9c1010")}),
            sword: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, specularity: 1, color: hex_color("#919191")}),
            orb: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, color: hex_color("#A9423F")}),
            laser: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, specularity: 1, color: hex_color("#FFFF00")}),
            grass: new Material(textured, {ambient: 1, texture: new Texture("assets/grass.png", "LINEAR_MIPMAP_LINEAR")}),
            start_menu: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .6, color: hex_color("#2fa62f")}),
        }

        this.shapes.field.arrays.texture_coord = this.shapes.field.arrays.texture_coord.map(x => x.times(16));

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 40), vec3(0, 0, 0), vec3(0, 1, 0));
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

    my_mouse_down(e, pos, context, program_state) {
        let pos_ndc_near = vec4(pos[0], pos[1], -1.0, 1.0);
        let pos_ndc_far  = vec4(pos[0], pos[1],  1.0, 1.0);
        let center_ndc_near = vec4(0.0, 0.0, -1.0, 1.0);
        let P = program_state.projection_transform;
        let V = program_state.camera_inverse;
        let pos_world_near = Mat4.inverse(P.times(V)).times(pos_ndc_near);
        let pos_world_far  = Mat4.inverse(P.times(V)).times(pos_ndc_far);
        let center_world_near  = Mat4.inverse(P.times(V)).times(center_ndc_near);
        pos_world_near.scale_by(1 / pos_world_near[3]);
        pos_world_far.scale_by(1 / pos_world_far[3]);
        center_world_near.scale_by(1 / center_world_near[3]);
        // console.log(pos_world_near);
        // console.log(pos_world_far);
        //
        // MOUSE PICKING POSITION IS ON 1 by 1 COORD

    }
    draw_start_screen(context, program_state) {
        // Customize this method to draw your start screen
        // For example, you can draw a message or an image indicating the start screen
        let model_transform = Mat4.identity();
        this.set_initial_background(context, program_state, model_transform);

        let start_menu_transform = model_transform.times(Mat4.scale(6, 2, 0, 0)).times(Mat4.translation(0, 0, 1));
        this.shapes.square.draw(context, program_state, start_menu_transform, this.materials.start_menu);

        // Draw start screen content
    }

    draw_levelup_screen(context, program_state) {
        // Draw three squares spaced evenly on the screen
        let model_transform = Mat4.identity()
        this.set_initial_background(context, program_state, model_transform);
        // Rectangle 1
        let opt1_transform = model_transform.times(Mat4.scale(5, 7, 0, 0)).times(Mat4.translation(-5, 0, 1));
        this.shapes.square.draw(context, program_state, opt1_transform, this.materials.start_menu.override({color: hex_color("#d0c9bf")}));

        // Rectangle 2
        let opt2_transform = model_transform.times(Mat4.scale(5, 7, 0, 0)).times(Mat4.translation(0, 0, 1));
        this.shapes.square.draw(context, program_state, opt2_transform, this.materials.start_menu.override({color: hex_color("#d0c9bf")}));

        // Rectangle 3
        let opt3_transform = model_transform.times(Mat4.scale(5, 7, 0, 0)).times(Mat4.translation(5, 0, 1));
        this.shapes.square.draw(context, program_state, opt3_transform, this.materials.start_menu.override({color: hex_color("#d0c9bf")}));
    }

    choose_levelup(x) {
        if (x < -0.33) {
            console.log("option 1");
            //handle opt 1
        } else if (x < 0.33) {
            console.log("option 2");
            //handle opt 2
        } else {
            console.log("option 3");
            //handle opt 3
        }
    }

    draw_start_menu(context, program_state, model_transform, t){
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
            .times(Mat4.scale(1, 1, 2)); // Adjust scale as needed
        this.player_polys.body.draw(context, program_state, body_transform, this.materials.player);

        let bar_length = 1.5*this.player.health/MAX_HEALTH;
        let bar_shift = 1.5 - bar_length;

        let bar_transform = player_transform.times(Mat4.translation(-bar_shift, 2, 2))
            .times(Mat4.scale(1.5*this.player.health/MAX_HEALTH, 0.15, 0.01));
        this.shapes.healthbar.draw(context, program_state, bar_transform, this.materials.healthbar)
        return player_transform;
    }

    draw_sword(context, program_state, model_transform, t){
        let mod_time = t % this.sword_stats.rotation_speed;
        let angle = 2*Math.PI*mod_time/this.sword_stats.rotation_speed;
        this.sword_transform1 = model_transform.times(Mat4.rotation(angle, 0, 0, 1))
            .times(Mat4.translation(4, 0, 0))
            .times(Mat4.scale(this.sword_stats.length,0.2,0.2));

        this.sword_transform2 = model_transform.times(Mat4.rotation(angle, 0, 0, 1))
            .times(Mat4.translation(-4, 0, 0))
            .times(Mat4.scale(this.sword_stats.length,0.2,0.2));

        this.weapon_polys.rect.draw(context, program_state, this.sword_transform1, this.materials.sword);
        this.weapon_polys.rect.draw(context, program_state, this.sword_transform2, this.materials.sword);

    }



    draw_laser(context, program_state, model_transform, t){


        let count = t / 2  ;
        if (count > lasers_left.length && lasers_left.length < 1) {
            lasers_left.push(new Projectile(MAX_HEALTH, model_transform));
        }
        if (count > lasers_right.length && lasers_right.length < 1) {
            lasers_right.push(new Projectile(MAX_HEALTH, model_transform));
        }

        lasers_left.forEach(element => {
            // Draw the head (sphere)
            let laser_transform = element.transform.times(Mat4.translation(0, 0, 1.5))
                .times(Mat4.scale(this.laser_stats.length, 0.3, 0.3)); // Adjust scale as needed
            this.weapon_polys.rect.draw(context, program_state, laser_transform, this.materials.laser);
        });
        lasers_right.forEach(element => {
            // Draw the head (sphere)
            let laser_transform = element.transform.times(Mat4.translation(0, 0, 1.5))
                .times(Mat4.scale(this.laser_stats.length, 0.3, 0.3)); // Adjust scale as needed
            this.weapon_polys.rect.draw(context, program_state, laser_transform, this.materials.laser);
        });

        this.update_laser_locations();

    }

    draw_orb(context, program_state, model_transform, t){
        let count = t / 2  ;
        if (count > orbs.length && orbs.length < 1) {
            orbs.push(new Projectile(MAX_HEALTH, model_transform));
        }

        orbs.forEach((element) =>{
            let orb_transform = element.transform.times(Mat4.translation(0, 0, 10));
            this.weapon_polys.circle.draw(context, program_state, orb_transform, this.materials.orb);

        })

        this.update_orb_locations(t);

    }

    update_laser_locations(){
        let toRemoveLeft = [];
        let toRemoveRight = [];
        let laser_x = 1;
        let laser_y = 0;

        lasers_left.forEach((element, index)  =>{
            let laser_transform = element.transform;
            let laser_pos = {x: element.transform[0][3], y: element.transform[1][3], z: element.transform[2][3]};
            element.transform = laser_transform.times(Mat4.translation(-laser_x, laser_y, 0));

            if (laser_pos.x < -70){
                element.onDeath();
                toRemoveLeft.push(index);
            }
        })
        lasers_right.forEach((element, index)  =>{
            let laser_transform = element.transform;
            let laser_pos = {x: element.transform[0][3], y: element.transform[1][3], z: element.transform[2][3]};
            element.transform = laser_transform.times(Mat4.translation(laser_x, laser_y, 0));

            if (laser_pos.x > 70){
                element.onDeath();
                toRemoveRight.push(index);
            }
        })
        for (let i = toRemoveLeft.length - 1; i >= 0; i--) {
            lasers_left.splice(toRemoveLeft [i], 1);
        }
        for (let i = toRemoveRight.length - 1; i >= 0; i--) {
            lasers_right.splice(toRemoveRight [i], 1);
        }
    }

    update_orb_locations(t){
        let toRemove = [];



        this.orb_neg = -1;
        let orb_x = this.orb_itnum * this.orb_neg;
        this.orb_itnum = this.orb_itnum + (this.orb_neg * 0.05);


        let a = 2;
        let b = 8;
        let c = 0;
        let orb_y = (-a * orb_x * orb_x) + (b * orb_x) + c ;
        let dy = -2 * a * orb_x + b;
        let vertex = -b/2*a;
        orbs.forEach((element, index) => {
            let orb_transform = element.transform;
            let orb_pos = {x: element.transform[0][3], y: element.transform[1][3], z: element.transform[2][3]};
            element.transform = orb_transform.times(Mat4.translation(orb_x/15, dy/15, 0));
            if (orb_pos.x > 40 || orb_pos.y > 40){
                this.orb_neg = -1;
                element.onDeath();
                this.orb_itnum = 0;
                toRemove.push(index);
                let rand = getRandomInteger(1, 3);
                if (rand === 1){
                    this.orb_neg = -1;
                }else{
                    this.orb_neg = 1;
                }
            }
        })
        for (let i = toRemove.length - 1; i >= 0; i--) {
            orbs.splice(toRemove [i], 1);
        }

    }

    check_collision(obj1_transform, obj2_transform, radius) {

        // Get the positions of the player and projectile
        const obj1_position = vec3(obj1_transform[0][3], obj1_transform[1][3], obj1_transform[2][3]);
        const obj2_position = vec3(obj2_transform[0][3], obj2_transform[1][3], obj2_transform[2][3]);

        // Define the radii of the spheres for collision detection
        const obj1_radius = radius; // Adjust as needed
        const obj2_radius = radius; // Adjust as needed

        // Calculate the distance between the centers of the spheres
        const distance = Math.sqrt(
            Math.pow(obj1_position[0] - obj2_position[0], 2) +
            Math.pow(obj1_position[1] - obj2_position[1], 2) +
            Math.pow(obj1_position[2] - obj2_position[2], 2)
        );

        // Check if there is a collision
        return distance < (obj1_radius + obj2_radius);
    }

    update_enemy_locations() {
        let toRemove = [];

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

            if (this.check_collision(this.player.transform, element.transform, 1.5)) {
                // Handle player death (you can customize this part)
                this.player.takeDamage(1);
                //element.takeDamage(10);
                //console.log("Player took 1 damage! Health: " + this.player.health);
                if(this.player.health <= 0){
                    this.start_screen = true;
                    this.cleanup_game();
                }
                // For example, reset the player's position
                //this.player_transform = Mat4.identity();
            }
            let sword1_points = gen_sword_points(this.player.transform, this.sword_transform1, this.sword_stats.length, 10, 3);
            let sword2_points = gen_sword_points(this.player.transform, this.sword_transform2, this.sword_stats.length, 10, 3);

            //console.log(sword1_points);
            //console.log(sword2_points);
            let enemy_pos = {x: element.transform[0][3], y: element.transform[1][3], z: element.transform[2][3]};

            //console.log(enemy_pos);

            let laser_collision = lasers_right;
            laser_collision.forEach((laser) =>{
                let laser_transform = laser.transform;
                if (this.check_collision(element.transform, laser_transform, 1)) {
                    element.takeDamage(this.laser_stats.damage);
                    element.hit = true;
                }
            })
            laser_collision = lasers_left;
            laser_collision.forEach((laser) =>{
                let laser_transform = laser.transform;
                if (this.check_collision(element.transform, laser_transform, 1)) {
                    element.takeDamage(this.laser_stats.damage);
                    element.hit = true;
                }
            })

            if (sword_collision(sword1_points, enemy_pos, 2) || sword_collision(sword2_points, enemy_pos, 2)){
                element.takeDamage(this.sword_stats.damage);
                element.hit = true;
                //console.log("enemy took 10 damage! Health: " + element.health);
            }
            if (!element.alive){
                toRemove.push(index);
                this.player.curr_xp += 1;
                if (this.player.curr_xp === this.player.levelup_xp) {
                    this.player.level += 1;
                    this.upgrade_gear();
                    this.levelup_state = true;

                    this.player.levelup_xp += 5;
                    this.player.curr_xp = 0;
                }
            }

        });

        for (let i = toRemove.length - 1; i >= 0; i--) {
            enemies.splice(toRemove[i], 1);
        }
    }

    generate_enemies(context, program_state, model_transform, t) {
        let count = t / 2 + 1;
        if (count > enemies.length) {
            let proj_transform = Mat4.identity();
            let spawn = edge % 4;
            if (spawn < 1) {
                proj_transform = proj_transform.times(Mat4.translation(this.player.transform[0][3] + MAX_X, this.player.transform[1][3] + getRandomInteger(MIN_Y, MAX_Y), PROJ_Z));
            } else if (spawn < 2) {
                proj_transform = proj_transform.times(Mat4.translation(this.player.transform[0][3] + getRandomInteger(MIN_X, MAX_X), this.player.transform[1][3] + MAX_Y, PROJ_Z));
            } else if (spawn < 3) {
                proj_transform = proj_transform.times(Mat4.translation(this.player.transform[0][3] + MIN_X, this.player.transform[1][3] + getRandomInteger(MIN_Y, MAX_Y), PROJ_Z));
            } else {
                proj_transform = proj_transform.times(Mat4.translation(this.player.transform[0][3] + getRandomInteger(MIN_X, MAX_X), this.player.transform[1][3] + MIN_Y, PROJ_Z));
            }
            edge++;
            enemies.push(new Enemy(MAX_HEALTH, proj_transform));
        }

        enemies.forEach(element => {
            // Draw the head (sphere)
            let enemy_transform = element.transform;
            let head_transform = enemy_transform.times(Mat4.translation(0, 0, 2))
                .times(Mat4.scale(1, 1, 1)); // Adjust scale as needed

            // Draw the body (cube)
            let body_transform = enemy_transform.times(Mat4.translation(0, 0, 0))
                .times(Mat4.scale(1, 1, 1.5)); // Adjust scale as needed


            if(element.hit === true){
                this.enemy_polys.head.draw(context, program_state, head_transform, this.materials.enemy.override({color:hex_color("#832b2b")}));
                this.enemy_polys.body.draw(context, program_state, body_transform, this.materials.enemy.override({color:hex_color("#832b2b")}));
                element.hit = false;
            }
            else {
                this.enemy_polys.head.draw(context, program_state, head_transform, this.materials.enemy);
                this.enemy_polys.body.draw(context, program_state, body_transform, this.materials.enemy);
            }
            let bar_length = 1.5*element.health/MAX_HEALTH;
            let bar_shift = 1.5 - bar_length;

            let bar_transform = Mat4.identity();
            bar_transform = bar_transform.times(Mat4.translation(enemy_transform[0][3] - bar_shift, enemy_transform[1][3] + 2, enemy_transform[2][3] + 2))
                .times(Mat4.scale(bar_length, 0.15, 0.01));
            this.shapes.healthbar.draw(context, program_state, bar_transform, this.materials.healthbar.override({color:hex_color("#ee1717")}))
        });

        this.update_enemy_locations();
    }

    set_initial_background(context, program_state, model_transform){
        model_transform = model_transform.times(Mat4.translation(0,0,-1))
            .times(Mat4.scale(50,50,0, 0));
        this.shapes.field.draw(context, program_state, model_transform, this.materials.grass);

        return model_transform;
    }

    upgrade_gear(){
        this.sword_stats.length += 0.2;
        this.sword_stats.damage += 1;
        this.sword_stats.rotation_speed -= 0.1;
    }

    cleanup_game(){
        this.player.level = 1;
        this.player.curr_xp = 0;
        this.player.levelup_xp = 5;
        this.player.transform = Mat4.identity();
        this.velocity = [0,0];
        this.speed = 0.08;

        enemies = [];
        orbs = [];
        lasers_left = [];
        lasers_right = [];

        this.sword_stats.length = 2;
        this.sword_stats.rotation_speed = 1;
        this.sword_stats.damage = 1;
    }

    display(context, program_state) {
        let canvas = context.canvas;
        const mouse_position = (e, rect = canvas.getBoundingClientRect()) =>
            vec((e.clientX - (rect.left + rect.right) / 2) / ((rect.right - rect.left) / 2),
                (e.clientY - (rect.bottom + rect.top) / 2) / ((rect.top - rect.bottom) / 2));

        canvas.addEventListener("mousedown", e => {
            e.preventDefault();
            if (this.start_screen) {
                this.start_screen = false;
            }
            const rect = canvas.getBoundingClientRect()
            /*
            console.log("e.clientX: " + e.clientX);
            console.log("e.clientX - rect.left: " + (e.clientX - rect.left));
            console.log("e.clientY: " + e.clientY);
            console.log("e.clientY - rect.top: " + (e.clientY - rect.top));
            console.log("mouse_position(e): " + mouse_position(e));
             */
            this.my_mouse_down(e, mouse_position(e), context, program_state);
            if(this.levelup_state) {
                this.levelup_state = false;
                this.choose_levelup(mouse_position(e)[0]);
            }
        });
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const light_position = vec4(0, 0, 50, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 500)];

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const yellow = hex_color("#fac91a");
        let model_transform = Mat4.identity();

        if (this.start_screen) {
            this.draw_start_screen(context, program_state);
        }
        else if(this.levelup_state) {
            this.draw_levelup_screen(context, program_state);
        }
        else {
            model_transform = this.set_initial_background(context, program_state, model_transform);
            //move player based on keypress
            this.player.transform = this.draw_player(context, program_state, this.player.transform);



            //move player based on keypress
            this.player.transform = this.draw_player(context, program_state, this.player.transform);

            //draw swords around player
            this.draw_sword(context, program_state, this.player.transform, t);

            //draw orbs
            this.draw_orb(context, program_state, this.player.transform, t);

            //draw laser projectiles
            this.draw_laser(context, program_state, this.player.transform, t);

            //generate and draw enemies
            this.generate_enemies(context, program_state, model_transform, t);
        }
    }
}

