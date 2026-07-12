const Joi = require('joi');
const apiResponse = require('../utils/apiResponse');

const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
    return apiResponse.badRequest(res, 'Validation failed', errors);
  }
  req[property] = value;
  next();
};

const fieldSchema = Joi.object({
  _id: Joi.string(),
  name: Joi.string().pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/).required(),
  label: Joi.string().required(),
  type: Joi.string().valid('text','textarea','richtext','number','boolean','date','media','relation','json','email','url','select','tags').required(),
  required: Joi.boolean().default(false),
  unique: Joi.boolean().default(false),
  defaultValue: Joi.any().default(null),
  placeholder: Joi.string().allow('').default(''),
  description: Joi.string().allow('').default(''),
  options: Joi.array().items(Joi.object({ label: Joi.string(), value: Joi.string() })).default([]),
  min: Joi.number(), max: Joi.number(), minLength: Joi.number(), maxLength: Joi.number(),
  relation: Joi.object({ contentType: Joi.string(), type: Joi.string().valid('one','many').default('one') }),
  order: Joi.number().default(0),
});

const authSchemas = {
  login: Joi.object({ email: Joi.string().email().required(), password: Joi.string().min(1).required() }),
  register: Joi.object({ name: Joi.string().min(2).max(100).required(), email: Joi.string().email().required(), password: Joi.string().min(8).required(), role: Joi.string().valid('admin','editor','viewer').default('editor') }),
  changePassword: Joi.object({ currentPassword: Joi.string().required(), newPassword: Joi.string().min(8).required() }),
};

const contentTypeSchemas = {
  create: Joi.object({ name: Joi.string().min(2).max(100).required(), description: Joi.string().max(500).allow('').default(''), icon: Joi.string().default('📄'), draftable: Joi.boolean().default(true), fields: Joi.array().items(fieldSchema).default([]) }),
  update: Joi.object({ name: Joi.string().min(2).max(100), description: Joi.string().max(500).allow(''), icon: Joi.string(), draftable: Joi.boolean(), isPublished: Joi.boolean(), fields: Joi.array().items(fieldSchema) }),
};

const entrySchemas = {
  create: Joi.object({ data: Joi.object().required(), status: Joi.string().valid('draft','published').default('draft'), locale: Joi.string().default('en') }),
  update: Joi.object({ data: Joi.object(), status: Joi.string().valid('draft','published','archived'), locale: Joi.string() }),
};

module.exports = { validate, authSchemas, contentTypeSchemas, entrySchemas };
