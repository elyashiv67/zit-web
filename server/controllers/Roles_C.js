import Role from "../modules/roles.js";
import User from "../modules/users.js";

// errors thrown here go to the error handler (Error_MID.js): duplicates -> 409, bad ids -> 400

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

async function createRole(req, res) {
    const role = await Role.create(req.valid_body);
    return res.status(201).json({message: "Role added successfully", role});
}

async function updateRole(req, res) {
    const updatedRole = await Role.findByIdAndUpdate(req.valid_id, req.valid_body, {returnDocument: 'after', runValidators: true});
    if (!updatedRole)
        return res.status(404).json({message: 'Role not found'});
    return res.status(200).json({message: 'Role updated successfully', role: updatedRole});
}

async function deleteRole(req, res) {
    const id = req.valid_id;

    if (await User.exists({role: id}))
        return res.status(409).json({message: 'Cannot delete role: still assigned to one or more users'});

    const deletedRole = await Role.findByIdAndDelete(id);
    if (!deletedRole)
        return res.status(404).json({message: 'Role not found'});
    return res.status(200).json({message: 'Role deleted successfully', id: deletedRole._id});
}

export {getAllRoles, getRoleById, createRole, updateRole, deleteRole};
