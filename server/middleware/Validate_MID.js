import {objectId} from '../schemas/common_S.js';

function formatIssues(issues) {
    return issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
    }));
}

// validate(schema?) — one middleware for every route:
//  - if the route has an :id param, checks it is a valid ObjectId -> req.valid_id
//  - if a body schema is given, parses req.body with it -> req.valid_body
//    (unknown keys are stripped, trims/lowercasing from the schema are applied)
//  - bodySchema can also be a function (req) => schema, e.g. a wider schema for admins
function validate(bodySchemaOrFn) {
    return (req, res, next) => {
        const bodySchema = typeof bodySchemaOrFn === 'function' ? bodySchemaOrFn(req) : bodySchemaOrFn;

        if (req.params.id !== undefined) {
            const id = objectId.safeParse(req.params.id);
            if (!id.success) {
                return res.status(400).json({message: 'id is not valid'});
            }
            req.valid_id = id.data;
        }

        if (bodySchema) {
            const body = bodySchema.safeParse(req.body ?? {});
            if (!body.success) {
                const errors = formatIssues(body.error.issues);
                const first = errors[0];
                return res.status(400).json({
                    message: first.path ? `invalid ${first.path}: ${first.message}` : first.message,
                    errors,
                });
            }
            req.valid_body = body.data;
        }

        next();
    };
}

export {validate};
