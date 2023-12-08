import {defs, tiny} from './examples/common.js';
import {Player, Enemy, Projectile} from './entity.js';
import {Shape_From_File} from "./examples/obj-file-demo.js";
import {getRandomInteger, calculateUnitVector, scale_velocity,
    sword_collision, gen_sword_points, Gouraud_Shader} from "./util.js";
import {Text_Line} from "./examples/text-demo.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Texture, Material, Scene,
} = tiny;

const MAX_X = 40;
const MIN_X = -40;
const MAX_Y = 25;
const MIN_Y = -25;
const PROJ_Z = 1;
const MAX_HEALTH = 75;

let enemies = [];

let edge = 0;
let start_time = 0;

let orbs = [];
let lasers_left = [];
let lasers_right = [];
let meteors = [];
let meteor_aoe = [];

let upgrades = [
    "upgrade sword",
    "new laser",
    "upgrade laser",
    "new orb",
    "upgrade orb",
    "evolve sword",
    "unlock meteor",
    "upgrade meteor",
];

//sword, laser, orb, meteor
let weapon_levels = [1, 0, 0];

let player_weapons = [];
player_weapons.push("sword");

let levelup_opts = [];

export class Polygon_Survivors extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.dir = "";
        this.highscore = 1;

        this.orb_itnum = 0;
        this.orb_neg = -1;

        this.meteor_itnum = 0;
        this.meteor_x = -2;
        this.meteor_y = 2;

        this.meteor_aoe_timer = 0;
        this.meteor_timer_cap = 50;
        this.meteor_aoe_count = 0;
        this.meteor_land_x = 0;
        this.meteor_land_y = 0;

        this.start_screen = true;

        this.player = new Player(MAX_HEALTH, 1, Mat4.identity(), [0,0], 0.13);
        this.levelup_state = false;
        this.evolve_sword = false;

        this.player_polys = {
            model: new Shape_From_File("./assets/player.obj"),
            head: new defs.Subdivision_Sphere(4),
            body: new defs.Cube(),
        }

        this.enemy_polys = {
            head: new defs.Subdivision_Sphere(4),
            body: new defs.Cube(),
            horn: new defs.Closed_Cone(50, 50, [[0, 2], [0, 1]]),

            type1: new Shape_From_File("./assets/model.obj"),
        }

        this.sword_stats = {
            damage: 3,
            rotation_speed: 1,
            length: 2,
            life_steal: 0,
        }

        this.laser_stats = {
            damage: 15,
            length: 1.5,
            rate: 1
        }

        this.orb_stats = {
            damage: 7,
            radius: 1.5
        }
        this.meteor_stats = {
            damage: 1.5,
            radius: 3,
        }


        this.weapon_polys = {
            sword: new Shape_From_File("./assets/shortsword.obj"),
            axe: new Shape_From_File("./assets/Hazard_Saw.obj"),
            meteor: new Shape_From_File("./assets/meteor.obj"),
            meteor2: new Shape_From_File("./assets/meteor2.obj"),

            rect: new defs.Cube(),
            circle: new defs.Subdivision_Sphere(3),
            circle4: new defs.Subdivision_Sphere(4),
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

            text: new Text_Line(30),
        };

        const textured = new defs.Textured_Phong(1);

        // *** Materials
        this.materials = {
            healthbar: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .6, color: hex_color("#00ef04")}),
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            enemy: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .6, color: hex_color("#4397ce")}),
            player: new Material(new Gouraud_Shader(),
                {ambient: 0.7, diffusivity: .6, color: hex_color("#75529d")}),
            sword: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, specularity: 1, color: hex_color("#919191")}),
            orb: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, color: hex_color("#858080")}),
            laser: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, specularity: 1, color: hex_color("#FFFF00")}),
            laser2: new Material(textured, {ambient: 1, texture: new Texture("assets/yellow1.png")}),
            horn: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, specularity: 1, color: hex_color("#dedede")}),
            grass: new Material(textured, {ambient: 1, texture: new Texture("assets/grass.png", "LINEAR_MIPMAP_LINEAR")}),
            start_menu: new Material(textured, {ambient: 1, texture: new Texture("assets/start_text.png", "LINEAR_MIPMAP_LINEAR")}),
            sword_icon: new Material(textured, {ambient: 1, texture: new Texture("assets/sword_icon.png")}),
            laser_icon: new Material(textured, {ambient: 1, texture: new Texture("assets/kraken.png")}),
            orb_icon: new Material(textured, {ambient: 1, texture: new Texture("assets/axe.png")}),
            evolved_sword_icon: new Material(textured, {ambient: 1, texture: new Texture("assets/bt.png")}),
            text_image: new Material(textured, {ambient: 1, diffusivity: 0, specularity: 0, texture: new Texture("assets/text.png")}),
            meteor: new Material(textured, {ambient: 1, texture: new Texture("assets/lava2.jpeg")}),
            meteor_rock: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: .6, specularity: 1, color: hex_color("#5e5e5e")}),
            meteor_icon: new Material(textured, {ambient: 1, texture: new Texture("assets/fireball.png")}),
        }

        this.shapes.field.arrays.texture_coord = this.shapes.field.arrays.texture_coord.map(x => x.times(16));

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 55), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        this.key_triggered_button("left", ["j"], function () {
            this.player.velocity[0] = -1;
            this.player.direction = -1;
        }, "#ff0000", function () {
            this.player.velocity[0] = 0;
            this.player.direction = 0;
        });
        this.key_triggered_button("right", ["l"], function () {
            this.player.velocity[0] = 1;
            this.player.direction = 1;
        }, "#ff0000", function () {
            this.player.velocity[0] = 0;
            this.player.direction = 0;
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
        let opt1_transform = model_transform.times(Mat4.scale(5, 5, 0, 0)).times(Mat4.translation(-3, 0, 1));
        let opt1_text_transform = opt1_transform.times(Mat4.translation(0, 1, 0)).times(Mat4.scale(1/6, 1/6, 0, 0)).times(Mat4.translation(0, 2, 0));
        //Rectangle 2
        let opt2_transform = model_transform.times(Mat4.scale(5, 5, 0, 0)).times(Mat4.translation(3, 0, 1));
        let opt2_text_transform = opt2_transform.times(Mat4.translation(0, 1, 0)).times(Mat4.scale(1/6, 1/6, 0, 0)).times(Mat4.translation(0, 2, 0));

        let materials = [];

        //each translation in following loop moves center by 0.75 chars
        for(let i = 0; i < levelup_opts.length; i++){
            if (levelup_opts[i] === "upgrade sword"){
                materials.push(this.materials.sword_icon);
                this.shapes.text.set_string("UPGRADE SWORD", context.context);
                if (i === 0) {
                    this.shapes.text.draw(context, program_state, opt1_text_transform.times(Mat4.translation(-9, 0, 0)), this.materials.text_image);
                } else {
                    this.shapes.text.draw(context, program_state, opt2_text_transform.times(Mat4.translation(-9, 0, 0)), this.materials.text_image);
                }
            }
            else if(levelup_opts[i] === "new laser"){
                materials.push(this.materials.laser_icon);
                this.shapes.text.set_string("UNLOCK LASER", context.context);
                if (i === 0) {
                    this.shapes.text.draw(context, program_state, opt1_text_transform.times(Mat4.translation(-8, 0, 0)), this.materials.text_image);
                } else {
                    this.shapes.text.draw(context, program_state, opt2_text_transform.times(Mat4.translation(-8, 0, 0)), this.materials.text_image);
                }
            }
            else if(levelup_opts[i] === "upgrade laser"){
                materials.push(this.materials.laser_icon);
                this.shapes.text.set_string("UPGRADE LASER", context.context);
                if (i === 0) {
                    this.shapes.text.draw(context, program_state, opt1_text_transform.times(Mat4.translation(-8.5, 0, 0)), this.materials.text_image);
                } else {
                    this.shapes.text.draw(context, program_state, opt2_text_transform.times(Mat4.translation(-8.5, 0, 0)), this.materials.text_image);
                }
            }
            else if(levelup_opts[i] === "new orb"){
                materials.push(this.materials.orb_icon);
                this.shapes.text.set_string("UNLOCK AXE", context.context);
                if (i === 0) {
                    this.shapes.text.draw(context, program_state, opt1_text_transform.times(Mat4.translation(-6.67, 0, 0)), this.materials.text_image);
                } else {
                    this.shapes.text.draw(context, program_state, opt2_text_transform.times(Mat4.translation(-6.67, 0, 0)), this.materials.text_image);
                }
            }
            else if(levelup_opts[i] === "upgrade orb"){
                materials.push(this.materials.orb_icon);
                this.shapes.text.set_string("UPGRADE AXE", context.context);
                if (i === 0) {
                    this.shapes.text.draw(context, program_state, opt1_text_transform.times(Mat4.translation(-7.33, 0, 0)), this.materials.text_image);
                } else {
                    this.shapes.text.draw(context, program_state, opt2_text_transform.times(Mat4.translation(-7.33, 0, 0)), this.materials.text_image);
                }
            }
            else if(levelup_opts[i] === "evolve sword"){
                materials.push(this.materials.evolved_sword_icon);
                this.shapes.text.set_string("EVOLVE SWORD", context.context);
                if (i === 0) {
                    this.shapes.text.draw(context, program_state, opt1_text_transform.times(Mat4.translation(-9, 0, 0)), this.materials.text_image);
                } else {
                    this.shapes.text.draw(context, program_state, opt2_text_transform.times(Mat4.translation(-9, 0, 0)), this.materials.text_image);
                }
            }
            else if(levelup_opts[i] === "unlock meteor"){
                materials.push(this.materials.meteor_icon);
                this.shapes.text.set_string("UNLOCK METEOR", context.context);
                if (i === 0) {
                    this.shapes.text.draw(context, program_state, opt1_text_transform.times(Mat4.translation(-9.75, 0, 0)), this.materials.text_image);
                } else {
                    this.shapes.text.draw(context, program_state, opt2_text_transform.times(Mat4.translation(-9.75, 0, 0)), this.materials.text_image);
                }
            }
            else if(levelup_opts[i] === "upgrade meteor"){
                materials.push(this.materials.meteor_icon);
                this.shapes.text.set_string("UPGRADE METEOR", context.context);
                if (i === 0) {
                    this.shapes.text.draw(context, program_state, opt1_text_transform.times(Mat4.translation(-9.75, 0, 0)), this.materials.text_image);
                } else {
                    this.shapes.text.draw(context, program_state, opt2_text_transform.times(Mat4.translation(-9.75, 0, 0)), this.materials.text_image);
                }
            }
        }

        console.log(materials.length);

        this.shapes.square.draw(context, program_state, opt1_transform, materials[0]);
        this.shapes.square.draw(context, program_state, opt2_transform, materials[1]);
    }

    valid_option(levelup_opts, option){
        if (levelup_opts.indexOf(option) !== -1){
            return false;
        }
        else if(this.player.laser && option === "new laser"){
            return false;
        }
        else if(!this.player.laser && option === "upgrade laser"){
            return false;
        }
        else if(this.player.orb && option === "new orb"){
            return false;
        }
        else if(!this.player.orb && option === "upgrade orb"){
            return false;
        }
        else if(weapon_levels[0] !== 4 && option === "evolve sword"){
            return false;
        }
        else if(weapon_levels[0] === 4 && option === "upgrade sword") {
            return false;
        }
        else if(this.evolve_sword && option === "evolve sword"){
            return false;
        }
        else if(this.evolve_sword && option === "upgrade sword"){
            return false;
        }
        else if(this.player.meteor && option === "unlock meteor"){
            return false;
        }
        else if(!this.player.meteor && option === "upgrade meteor"){
            return false;
        }
        else{
            return true;
        }
    }
    gen_levelup_opts() {
        let levelup_opts = [];
        for (let i=0; i<2; i++){
            let randomIndex = Math.floor(Math.random() * upgrades.length);
            while(!this.valid_option(levelup_opts, upgrades[randomIndex])){
                randomIndex = Math.floor(Math.random() * upgrades.length);
            }
            levelup_opts.push(upgrades[randomIndex]);
        }
        return levelup_opts;
    }

    execute_option(option){
        switch (option){
            case "upgrade sword":
                this.sword_stats.damage += 2;
                this.sword_stats.length += 0.2;
                if(this.sword_stats.rotation_speed > 0.2){
                    this.sword_stats.rotation_speed -= 0.2;
                }
                console.log("upgraded sword!");
                weapon_levels[0]++;
                break;
            case "new laser":
                this.player.laser = true;
                console.log("added new laser!");
                player_weapons.push("laser");
                weapon_levels[1]++;
                break;
            case "upgrade laser":
                this.laser_stats.damage += 5;
                this.laser_stats.rate += 1;
                console.log("upgraded laser!");
                weapon_levels[1]++;
                break;
            case "new orb":
                this.player.orb = true;
                console.log("added new orb!");
                player_weapons.push("orb");
                weapon_levels[2]++;
                break;
            case "upgrade orb":
                this.orb_stats.damage += 5;
                this.orb_stats.radius += 0.3;
                console.log("upgraded laser!");
                weapon_levels[2]++;
                break;
            case "evolve sword":
                this.sword_stats.life_steal = 0.1;
                this.evolve_sword = true;
                break;
            case "unlock meteor":
                this.player.meteor = true;
                player_weapons.push("meteor");
                break;
            case "upgrade meteor":
                this.meteor_stats.radius += 0.5;

                this.meteor_stats.damage += 1;
                this.meteor_timer_cap += 5;

                break;
        }
    }
    choose_levelup(x) {
        if (x < 0) {
            console.log("option 1");
            this.execute_option(levelup_opts[0]);
            //handle opt 1
        }
        else {
            console.log("option 2");
            this.execute_option(levelup_opts[1]);
            //handle opt 3
        }
    }

    draw_player(context, program_state, model_transform){
        let new_velocity = scale_velocity(this.player.velocity, this.player.speed);
        //console.log(new_velocity[0], new_velocity[1]);

        let player_transform = model_transform.times(Mat4.translation(new_velocity[0], new_velocity[1], 0));// Draw the player (sphere)
        //this.player_polys.model.draw(context, program_state, player_transform, this.materials.player);

        let dir_transform;
        if(this.player.direction === -1){
            dir_transform = player_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0));
        }
        else if(this.player.direction === 1){
            dir_transform = player_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                .times(Mat4.rotation(Math.PI, 0, 1, 0));
        }
        else{
            dir_transform = player_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                .times(Mat4.rotation(Math.PI/2, 0, 1, 0));
        }

        let final_transform = dir_transform.times(Mat4.translation(0, 2, 0));
        this.player_polys.model.draw(context, program_state, final_transform, this.materials.player);

        let bar_length = 1.5*this.player.health/MAX_HEALTH;
        let bar_shift = 1.5 - bar_length;
        //console.log("player health: " + this.player.health);

        let bar_transform = player_transform.times(Mat4.translation(-bar_shift, 2, 2))
            .times(Mat4.scale(1.5*this.player.health/MAX_HEALTH, 0.15, 0.01));
        this.shapes.healthbar.draw(context, program_state, bar_transform, this.materials.healthbar)
        return player_transform;
    }

    draw_sword(context, program_state, model_transform, t){
        let mod_time = t % this.sword_stats.rotation_speed;
        let angle = 2*Math.PI*mod_time/this.sword_stats.rotation_speed;
        let sword1_draw_transform = model_transform.times(Mat4.rotation(angle, 0, 0, 1))
            .times(Mat4.scale(this.sword_stats.length/3.4,this.sword_stats.length/3.4,this.sword_stats.length/3.4))
            .times(Mat4.translation(4, 0, 0))
            .times(Mat4.rotation(-Math.PI/2, 0, 0, 1));


        this.sword_transform1 = model_transform.times(Mat4.rotation(angle, 0, 0, 1))
            .times(Mat4.translation(4, 0, 0))
            .times(Mat4.scale(this.sword_stats.length,0.2,0.2));

        let sword2_draw_transform = model_transform.times(Mat4.rotation(angle, 0, 0, 1))
            .times(Mat4.scale(this.sword_stats.length/3.4,this.sword_stats.length/3.4,this.sword_stats.length/3.4))
            .times(Mat4.translation(-4, 0, 0))
            .times(Mat4.rotation(Math.PI/2, 0, 0, 1));

        this.sword_transform2 = model_transform.times(Mat4.rotation(angle, 0, 0, 1))
            .times(Mat4.translation(-4, 0, 0))
            .times(Mat4.scale(this.sword_stats.length,0.2,0.2));

        let material = this.materials.sword;
        if (this.evolve_sword){
            material = this.materials.sword.override({color: hex_color("#c30010")})
        }
        this.weapon_polys.sword.draw(context, program_state, sword1_draw_transform, material);
        //this.weapon_polys.rect.draw(context, program_state, this.sword_transform1, this.materials.enemy);

        this.weapon_polys.sword.draw(context, program_state, sword2_draw_transform, material);
        //this.weapon_polys.rect.draw(context, program_state, this.sword_transform2, this.materials.enemy);

    }



    draw_laser(context, program_state, model_transform, t){
        let count = t / 2  ;
        if (count > lasers_left.length && lasers_left.length < this.laser_stats.rate) {
            lasers_left.push(new Projectile(MAX_HEALTH, model_transform));
        }
        if (count > lasers_right.length && lasers_right.length < this.laser_stats.rate) {
            lasers_right.push(new Projectile(MAX_HEALTH, model_transform));
        }

        lasers_left.forEach(element => {
            // Draw the head (sphere)
            let laser_transform = element.transform.times(Mat4.translation(0, 0, 1.5))
                .times(Mat4.scale(this.laser_stats.length, 0.3, 0.3)); // Adjust scale as needed
            this.weapon_polys.rect.draw(context, program_state, laser_transform, this.materials.laser2);
        });
        lasers_right.forEach(element => {
            // Draw the head (sphere)
            let laser_transform = element.transform.times(Mat4.translation(0, 0, 1.5))
                .times(Mat4.scale(this.laser_stats.length, 0.3, 0.3)); // Adjust scale as needed
            this.weapon_polys.rect.draw(context, program_state, laser_transform, this.materials.laser2);
        });

        this.update_laser_locations();

    }

    draw_orb(context, program_state, model_transform, t){
        let count = t / 2  ;
        if (count > orbs.length && orbs.length < 1) {
            orbs.push(new Projectile(MAX_HEALTH, model_transform));
        }

        orbs.forEach((element) =>{
            let axe_transform = element.transform.times(Mat4.translation(0, 0, 3))
                .times(Mat4.scale(this.orb_stats.radius, this.orb_stats.radius, this.orb_stats.radius))
                .times(Mat4.rotation(10*t, 0, 0, 1));

            this.weapon_polys.axe.draw(context, program_state, axe_transform, this.materials.orb)
        })

        this.update_orb_locations(t);
    }

    draw_meteor(context, program_state, model_transform, t){
        let count = t / 2  ;
        if (count > meteors.length && meteors.length < 1) {
            meteors.push(new Projectile(MAX_HEALTH, model_transform));
        }

        meteors.forEach((element) =>{
            let meteor_transform = element.transform.times(Mat4.translation(0, 0, 70))
                .times(Mat4.scale(this.meteor_stats.radius/1.5, this.meteor_stats.radius/1.5, this.meteor_stats.radius/1.5))
                .times (Mat4.rotation(5*t, 1, 1, 1));
            this.weapon_polys.meteor2.draw(context, program_state, meteor_transform, this.materials.meteor_rock);

        })
        this.update_meteor_locations(context, program_state);
        this.update_meteor_aoe();
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

        let orb_x = this.orb_itnum ;
        this.orb_itnum = this.orb_itnum + (0.05);

        let a = 2;
        let b = 8;
        let c = 0;
        let orb_y = (-a * orb_x * orb_x) + (b * orb_x) + c ;
        let dy = -2 * a * orb_x + b;
        let vertex = -b/2*a;
        orbs.forEach((element, index) => {
            let orb_transform = element.transform;
            let orb_pos = {x: element.transform[0][3], y: element.transform[1][3], z: element.transform[2][3]};
            element.transform = orb_transform.times(Mat4.translation(this.orb_neg * orb_x/15, dy/15, 0));
            if (orb_pos.x > 40 || orb_pos.y < -40){
                element.onDeath();
                this.orb_itnum = 0;
                toRemove.push(index);
                let rand = getRandomInteger(1, 2);
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

    update_meteor_locations(context, program_state){
        let toRemove = [];

        let meteor_x = 3;
        let meteor_y = 3;
        this.meteor_itnum = this.meteor_itnum - 0.02;
        let meteor_z = this.meteor_itnum;


        meteors.forEach((meteor, index) => {
            let meteor_transform = meteor.transform;
            let meteor_pos = {x: meteor.transform[0][3], y: meteor.transform[1][3], z: meteor.transform[2][3]};
            meteor.transform = meteor_transform.times(Mat4.translation(this.meteor_x/15, this.meteor_y/15, meteor_z));


            if (meteor_pos.z < -100){
                this.meteor_aoe_count ++;
                this.meteor_land_x = meteor_pos.x;
                this.meteor_land_y = meteor_pos.y;

                meteor.onDeath();
                this.meteor_itnum = 0;
                toRemove.push(index);
                let rand1 = getRandomInteger(-2, 2);
                let rand2 = getRandomInteger(-2, 2);
                this.meteor_x = rand1;
                this.meteor_y = rand2;

            }
        })
        for (let i = toRemove.length - 1; i >= 0; i--) {
            meteors.splice(toRemove [i], 1);
        }

    }
    draw_meteor_aoe(context, program_state, model_transform) {
        if (meteor_aoe.length < this.meteor_aoe_count){
            meteor_aoe.push(new Projectile(MAX_HEALTH, model_transform));
        }
        meteor_aoe.forEach((element) =>{
            let aoe_transform = Mat4.identity().times(Mat4.translation(this.meteor_land_x, this.meteor_land_y, -1))
                .times(Mat4.scale(this.meteor_stats.radius*2, this.meteor_stats.radius*2, 1));
            element.transform = aoe_transform;

            this.weapon_polys.circle4.draw(context, program_state, aoe_transform, this.materials.meteor);

        })

    }

    update_meteor_aoe(){
        let toRemove = [];
        meteor_aoe.forEach((meteor, index) =>{
            this.meteor_aoe_timer ++;
            if (this.meteor_aoe_timer > this.meteor_timer_cap){
                this.meteor_aoe_timer = 0;
                toRemove.push(index);
                this.meteor_aoe_count --;

            }


        })
        for (let i = toRemove.length - 1; i >= 0; i--) {
            meteor_aoe.splice(toRemove [i], 1);
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
            if (element.level === 4){
                element.transform = enemy_transform
                    .times(Mat4.rotation(angleDifference, 0, 0, 1))
                    .times(Mat4.translation(0.04, 0, 0));
            }else {
                element.transform = enemy_transform
                    .times(Mat4.rotation(angleDifference, 0, 0, 1))
                    .times(Mat4.translation(0.025, 0, 0));
            }

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
            //console.log(enemy_pos);
            meteor_aoe.forEach((meteor)=>{

                if (this.check_collision(element.transform, meteor.transform, this.meteor_stats.radius*1.2)){
                    element.takeDamage(this.meteor_stats.damage);
                    element.hit = true;
                }


            })

            lasers_right.forEach((laser) =>{
                if (this.check_collision(element.transform, laser.transform, 1)){
                    element.takeDamage(this.laser_stats.damage);
                    element.hit = true;
                }
            })

            lasers_left.forEach((laser) =>{
                if (this.check_collision(element.transform, laser.transform, 1)){
                    element.takeDamage(this.laser_stats.damage);
                    element.hit = true;
                }
            })

            orbs.forEach((orb)=>{
                if (this.check_collision(element.transform, orb.transform, this.orb_stats.radius)){
                    element.takeDamage(this.orb_stats.damage);
                    element.hit = true;
                }
            })


            let sword1_points = gen_sword_points(this.player.transform, this.sword_transform1, this.sword_stats.length, 10, 3);
            let sword2_points = gen_sword_points(this.player.transform, this.sword_transform2, this.sword_stats.length, 10, 3);

            //console.log(sword1_points);
            //console.log(sword2_points);
            let enemy_pos = {x: element.transform[0][3], y: element.transform[1][3], z: element.transform[2][3]};

            if (sword_collision(sword1_points, enemy_pos, 2) || sword_collision(sword2_points, enemy_pos, 2)){
                element.takeDamage(this.sword_stats.damage);
                let heal = this.sword_stats.damage * this.sword_stats.life_steal;
                if (this.player.health + heal > MAX_HEALTH) {
                    this.player.health = MAX_HEALTH
                } else {
                    this.player.health += this.sword_stats.damage * this.sword_stats.life_steal;
                }
                element.hit = true;
                //console.log("enemy took 10 damage! Health: " + element.health);
            }


            if (!element.alive){
                toRemove.push(index);
                this.player.curr_xp += 1;
                if (element.level > 1){
                    this.player.curr_xp += element.level/2;
                }
                if (this.player.curr_xp >= this.player.levelup_xp) {
                    this.player.level += 1;
                    if (this.player.level > this.highscore) {
                        this.highscore = this.player.level;
                    }
                    this.levelup_state = true;
                    levelup_opts = this.gen_levelup_opts();
                    console.log(levelup_opts);

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

            console.log(this.player.level);
            if(this.player.level === 1){
                enemies.push(new Enemy(MAX_HEALTH, proj_transform, 1));
            }
            else if(this.player.level === 2){
                let index = Math.floor(Math.random() * 3);

                if(index < 2){
                    enemies.push(new Enemy(MAX_HEALTH, proj_transform, 1));
                }
                else{
                    enemies.push(new Enemy(MAX_HEALTH, proj_transform, 2));
                }
            }
            else if(this.player.level === 3){
                let index = Math.floor(Math.random() * 4);

                if(index < 1){
                    enemies.push(new Enemy(MAX_HEALTH, proj_transform, 1));
                }
                else if(index < 3){
                    enemies.push(new Enemy(MAX_HEALTH, proj_transform, 2));
                }
                else if(index < 4){
                    enemies.push(new Enemy(MAX_HEALTH, proj_transform, 3));
                }
            }
            else if(this.player.level >= 4 && this.player.level < 7){
                let index = Math.floor(Math.random() * 4);

                if(index < 2){
                    enemies.push(new Enemy(MAX_HEALTH, proj_transform, 2));
                }
                else {
                    enemies.push(new Enemy(MAX_HEALTH, proj_transform, 3));
                }
            }
            else if(this.player.level >= 7){
                //enemies.push(new Enemy(MAX_HEALTH, proj_transform, 3));
                let index = Math.floor(Math.random() * 4);

                if(index < 3){
                    enemies.push(new Enemy(MAX_HEALTH, proj_transform, 3));
                }
                else {
                    enemies.push(new Enemy(MAX_HEALTH, proj_transform, 4));
                }
            }
        }

        enemies.forEach(element => {
            // Draw the head (sphere)
            //console.log("drawing enemy");

            //decide size and color based on level

            let enemy_transform = this.draw_enemy(context, program_state, element.level, element.hit, element.transform, t);
            if (element.hit === true){
                element.hit = false;
            }
            //this.enemy_polys.head.draw(context, program_state, head_transform, material);
            ///this.enemy_polys.body.draw(context, program_state, body_transform, material);

            let bar_length = 1.5*element.health/(element.level*MAX_HEALTH);
            let bar_shift = 1.5 - bar_length;

            let bar_transform = Mat4.identity();
            bar_transform = bar_transform.times(Mat4.translation(enemy_transform[0][3] - bar_shift, enemy_transform[1][3] + 2, enemy_transform[2][3] + 2))
                .times(Mat4.scale(bar_length, 0.15, 0.01));
            this.shapes.healthbar.draw(context, program_state, bar_transform, this.materials.healthbar.override({color:hex_color("#ee1717")}))
        });

        this.update_enemy_locations();
    }

    draw_enemy(context, program_state, level, hit, enemy_transform, t){
        let scale = 1 + (level - 1) * 0.4;
        if (level === 4){
            scale = 1 + (2 - 1) * 0.4;
        }

        let material;
        if(hit === true){
            material = this.materials.enemy.override({color:hex_color("#832b2b")});

        }
        else if (level === 1){
            material = this.materials.enemy;
        }
        else if(level === 2){
            material = this.materials.enemy.override({color:hex_color("#5c3ea2")})
        }
        else if(level === 3){
            material = this.materials.enemy.override({color:hex_color("#5e1616")})
        }else{
            material = this.materials.enemy.override({color:hex_color("#FFB6C1")})
        }

        let horn1_transform = enemy_transform.times(Mat4.translation(1.3 * scale, 0, scale))
            .times(Mat4.rotation(Math.PI/4, 0, 1, 0))
            .times(Mat4.scale(0.3, 0.3, 1));

        let horn2_transform = enemy_transform.times(Mat4.translation(scale, scale, 0.6 * scale))
            .times(Mat4.rotation(Math.PI/4, 0, 1, 0))
            .times(Mat4.rotation(-Math.PI/6, 1, 0, 1))
            .times(Mat4.scale(0.3, 0.3, 1));

        let horn3_transform = enemy_transform.times(Mat4.translation(scale, -scale, 0.6 * scale))
            .times(Mat4.rotation(Math.PI/4, 0, 1, 0))
            .times(Mat4.rotation(Math.PI/6, 1, 0, 1))
            .times(Mat4.scale(0.3, 0.3, 1));

        enemy_transform = enemy_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.rotation(5.0*Math.PI/4.0, 0, 1, 0))
            .times(Mat4.scale(scale + 0.05*Math.sin(3.5*t), scale + 0.05*Math.sin(3.5*t), scale + 0.05*Math.sin(3.5*t)));

        if(level === 1){
            this.enemy_polys.type1.draw(context, program_state, enemy_transform, material);
            this.enemy_polys.horn.draw(context, program_state, horn1_transform, hit? material : this.materials.horn);
        }
        else if(level === 2){
            this.enemy_polys.type1.draw(context, program_state, enemy_transform, material);
            this.enemy_polys.horn.draw(context, program_state, horn2_transform, hit? material : this.materials.horn);
            this.enemy_polys.horn.draw(context, program_state, horn3_transform, hit? material : this.materials.horn);
        }
        else if(level === 3){
            this.enemy_polys.type1.draw(context, program_state, enemy_transform, material);

            this.enemy_polys.horn.draw(context, program_state, horn1_transform, hit? material : this.materials.horn);
            this.enemy_polys.horn.draw(context, program_state, horn2_transform, hit? material : this.materials.horn);
            this.enemy_polys.horn.draw(context, program_state, horn3_transform, hit? material : this.materials.horn);
        }else{
            this.enemy_polys.type1.draw(context, program_state, enemy_transform, material);
            this.enemy_polys.horn.draw(context, program_state, horn2_transform, hit? material : this.materials.horn);
            this.enemy_polys.horn.draw(context, program_state, horn3_transform, hit? material : this.materials.horn);
        }


        return enemy_transform;
    }
    set_initial_background(context, program_state, model_transform){
        model_transform = model_transform.times(Mat4.translation(0,0,-1))
            .times(Mat4.scale(50,50,0, 0));
        this.shapes.field.draw(context, program_state, model_transform, this.materials.grass);

        return model_transform;
    }

    draw_loadout(context, program_state) {
        // Draw the initial background
        let model_transform = Mat4.identity();
        this.set_initial_background(context, program_state, model_transform);

        // Draw a square at the top-left corner of the screen
        let square_transform = model_transform
            .times(Mat4.translation(-34, 18, 5))
            .times(Mat4.scale(2, 2, 0));
        //console.log(square_transform);

        for (let i = 0; i < player_weapons.length; i++) {
            if (player_weapons[i] === "sword" && !this.evolve_sword) {
                this.shapes.square.draw(context, program_state, square_transform, this.materials.sword_icon);
            } else if (player_weapons[i] === "sword" && this.evolve_sword) {
                this.shapes.square.draw(context, program_state, square_transform, this.materials.evolved_sword_icon);
            } else if (player_weapons[i] === "orb") {
                this.shapes.square.draw(context, program_state, square_transform, this.materials.orb_icon);
            } else if (player_weapons[i] === "meteor") {
                this.shapes.square.draw(context, program_state, square_transform, this.materials.meteor_icon);
            } else {
                this.shapes.square.draw(context, program_state, square_transform, this.materials.laser_icon);
            }
            square_transform = square_transform.times(Mat4.translation(2.5, 0, 0));
        }
    }

    draw_level_text(context, program_state) {
        let model_transform = Mat4.identity();
        this.set_initial_background(context, program_state, model_transform);

        let level_transform = model_transform
            .times(Mat4.translation(-5, 19, 5));

        let level_str = "Level: " + this.player.level + "      High Score: " + this.highscore;
        console.log(level_str);
        this.shapes.text.set_string(level_str, context.context);
        this.shapes.text.draw(context, program_state, level_transform, this.materials.text_image);
    }

    cleanup_game(){
        this.player.health = MAX_HEALTH;
        this.player.level = 1;
        this.player.curr_xp = 0;
        this.player.levelup_xp = 5;
        this.player.transform = Mat4.identity();
        this.player.velocity = [0,0];
        this.player.speed = 0.08;

        this.player.sword = true;
        this.player.laser = false;
        this.player.orb = false;
        this.evolve_sword = false;
        this.player.meteor = false;

        enemies = [];
        orbs = [];
        lasers_left = [];
        lasers_right = [];
        player_weapons = ["sword"];

        this.sword_stats.length = 2;
        this.sword_stats.rotation_speed = 1;
        this.sword_stats.damage = 3;
        this.sword_stats.life_steal = 0;

        this.laser_stats.damage = 15;
        this.laser_stats.length = 1.5;
        this.laser_stats.rate = 1;

        this.orb_stats.damage = 7;
        this.orb_stats.radius = 1.5;

        this.meteor_stats.damage = 1.5;
        this.meteor_stats.radius = 3;

        weapon_levels[0] = 0;
        weapon_levels[1] = 0;
        weapon_levels[2] = 0;


    }

    draw_light(model_transform, program_state){
        let rot1 = model_transform.times(Mat4.rotation(this.rotation_angle,0,1,0))
            .times(Mat4.translation(0,0,60));
        let light_vec = vec4(rot1[0][3],rot1[1][3], rot1[2][3], 1);
        //console.log("light_Vec " + light_vec);

        if (light_vec[2] < 0){
            rot1 = model_transform.times(Mat4.rotation(this.rotation_angle+Math.PI,0,1,0))
                .times(Mat4.translation(0,0,60));
            light_vec = vec4(rot1[0][3],rot1[1][3], rot1[2][3], 1);
            program_state.lights = [new Light(light_vec, color(255, 0, 0, 1), 1)];
        }else {
            // The parameters of the Light are: position, color, size
            program_state.lights = [new Light(light_vec, color(255, 255, 255, 1), 1)];
        }
        return program_state;
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
            //this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);




        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let round_time = t - start_time;
        const yellow = hex_color("#fac91a");
        let model_transform = Mat4.identity();

        this.light_position = model_transform;
        this.rotation_angle = t/5;
        this.draw_light(this.light_position, program_state);
        //program_state.lights = [new Light(vec4(0,0,150,1), color(255, 255, 255, 1), 10)];

        if (this.start_screen) {
            this.draw_start_screen(context, program_state);
            start_time = t;
            //console.log("start time reset to: " + start_time);
        }
        else if(this.levelup_state) {
            this.draw_levelup_screen(context, program_state);
            this.draw_level_text(context, program_state);
        }
        else {
            //console.log("round time is: " + round_time);
            model_transform = this.set_initial_background(context, program_state, model_transform);

            //draws weapon tray
            this.draw_loadout(context, program_state)
            this.draw_level_text(context, program_state);

            //move player based on keypress
            this.player.transform = this.draw_player(context, program_state, this.player.transform);

            //draw swords around player
            if(this.player.sword) {
                this.draw_sword(context, program_state, this.player.transform, t);
            }

            //draw orbs
            if(this.player.orb) {
                this.draw_orb(context, program_state, this.player.transform, round_time);
            }
            //draw laser projectiles
            if(this.player.laser) {
                this.draw_laser(context, program_state, this.player.transform, t);
            }

            if(this.player.meteor) {
                let meteor_spawn = Mat4.identity();
                let rand_x = getRandomInteger(-5,5);
                let rand_y = getRandomInteger(-5,5);
                meteor_spawn = meteor_spawn.times(Mat4.translation(rand_x, rand_y, 0));
                this.draw_meteor(context, program_state, meteor_spawn, t);
                this.draw_meteor_aoe(context, program_state, Mat4.identity());
            }
            //generate and draw enemies
            this.generate_enemies(context, program_state, model_transform, round_time);
        }
    }
}

