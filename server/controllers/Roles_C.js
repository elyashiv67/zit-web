import Role from "../modules/roles.js";

async function getAllRoles(req, res) {
    try {
        const roles = await Role.find();

        if (roles.length === 0) {
            return res.status(404).json({message: "No role found"});
        }
        return res.status(200).json(roles);
    } catch (err) {
        res.status(500).json({message: `An error occurred: ${err} in all role`});
    }
}

async function getRoleById(req, res) {
    try {
        const id = req.valid_id;
        const role = await Role.findById(id);

        if (!role) {
            return res.status(404).json({message: "No role found"});
        }
        return res.status(200).json(role);
    } catch (e) {
        res.status(500).json({message: `Server error: ${e.message} in role id`});
    }
}

async function createRole(req, res) {
    try {
        const {name, level} = req.body;
        const role = await Role.create({name, level});


        return res.status(201).json({
            message: "role added successfully",
            role: role
        });

    } catch (e) {
        res.status(500).json({message: `Server error: ${e.message}`});
    }
}

async function updateRole(req, res) {
    try {
        const id = req.valid_id;
        const {name, level} = req.body;
        const updatedData = {
            ...(name !== undefined && {name}),
            ...(level !== undefined && {level})
        }

        const updatedRole = await Role.findByIdAndUpdate(
            id,
            updatedData,
            {new: true, runValidators: true}
        );

        res.status(200).json({
            message: 'Role updated successfully',
            role: updatedRole
        });
    } catch (e) {
        res.status(500).json({message: `Role not updated ${e}`});
    }
}

async function deleteRole(req, res) {
    try {
        const id = req.valid_id;
        const deletedRole = await Role.findByIdAndDelete(id, {});
        if (!deletedRole) {
            return res.status(404).json({message: 'Role not found'});
        }
        res.status(201).json({
            message: 'Role deleted successfully',
            role: deletedRole
        });
    } catch (e) {
        res.status(500).json({message: `Server error: ${e.message}`});
    }
}

export {getAllRoles, getRoleById, createRole, updateRole, deleteRole}

