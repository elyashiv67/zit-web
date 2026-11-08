import Role from "../modules/roles.js";

// read-only: the roles are seeded once (admin, user) and never changed through the API

async function getAllRoles(req, res) {
    const roles = await Role.find();
    return res.status(200).json(roles);
}

async function getRoleById(req, res) {
    const role = await Role.findById(req.valid_id);
    if (!role)
        return res.status(404).json({message: "Role not found"});
    return res.status(200).json(role);
}

export {getAllRoles, getRoleById};
