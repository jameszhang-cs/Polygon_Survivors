export function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateUnitVector(pos1, pos2) {
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

export function scale_velocity(velocity, speed){
    let currentMagnitude = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]);
    if(currentMagnitude === 0){
        return velocity;
    }

    let normalized_velocity = [velocity[0]/currentMagnitude, velocity[1]/currentMagnitude];
    return [normalized_velocity[0]*speed, normalized_velocity[1]*speed];
}

export function sword_collision(points, center, radius) {
    //console.log("checking enemy at: " + center.x + ", " + center.y + ", " + center.z);
    return points.some(point =>
        point_in_sphere(point, center, radius));
}
function point_in_sphere(point, center, radius) {
    //console.log("for point at: " + point.x + ", " + point.y + ", " + point.z);
    let dist_square = (point.x - center.x) ** 2 +
        (point.y - center.y) ** 2 +
        (point.z - center.z) ** 2;
    //console.log(dist_square, radius ** 2);
    return dist_square < radius ** 2;
}

export function gen_sword_points(player_transform, sword_transform, length, num_points, offset) {
    const player_pos = pos_from_vec(player_transform);
    const dir = get_sword_dir(player_transform, sword_transform);

    // Calculate the initial start point of the sword with the offset
    const start_point = {
        x: player_pos.x + dir.x * offset,
        y: player_pos.y + dir.y * offset,
        z: player_pos.z + dir.z * offset
    };

    let points = [start_point]; // Include the initial start point
    for (let i = 1; i < num_points; i++) {
        let scale = i / (num_points - 1) * length;
        points.push({
            x: start_point.x + dir.x * scale,
            y: start_point.y + dir.y * scale,
            z: start_point.z + dir.z * scale
        });
    }
    return points;
}

function get_sword_dir(player_transform, sword_transform) {
    const player_pos = pos_from_vec(player_transform);
    const sword_pos = pos_from_vec(sword_transform);

    // Assuming the sword's position is relative to the player
    return norm_vec({
        x: sword_pos.x - player_pos.x,
        y: sword_pos.y - player_pos.y,
        z: sword_pos.z - player_pos.z
    });
}

function norm_vec(vector) {
    const length = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
    return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length
    };
}

function pos_from_vec(matrix) {
    return {
        x: matrix[0][3],
        y: matrix[1][3],
        z: matrix[2][3]
    };
}