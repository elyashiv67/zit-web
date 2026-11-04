import {z} from 'zod';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const pagingSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

// ?page=&limit= on list routes -> req.paging = {page, limit}. Bad values are a 400, not silently fixed,
// so a frontend bug shows up right away
function paging(req, res, next) {
    const result = pagingSchema.safeParse({page: req.query.page, limit: req.query.limit});
    if (!result.success) {
        const issue = result.error.issues[0];
        return res.status(400).json({message: `invalid ${issue.path.join('.')}: ${issue.message}`});
    }
    req.paging = result.data;
    next();
}

// one page of Model.find(filter) + the total, in the shape every list route returns:
// {items, page, limit, total, pages}. `sort` must end with _id so the order is stable between pages
// (two rows with the same createdAt would otherwise swap and show up twice / not at all)
async function findPage(Model, filter, {page, limit}, {sort, select} = {}) {
    let query = Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
    if (select) query = query.select(select);

    const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
    return {items, page, limit, total, pages: Math.ceil(total / limit)};
}

export {paging, findPage, DEFAULT_LIMIT, MAX_LIMIT};
