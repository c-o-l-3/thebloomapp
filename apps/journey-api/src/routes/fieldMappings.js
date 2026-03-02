import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Field type definitions
const FIELD_TYPES = [
  'TEXT',
  'NUMBER',
  'DATE',
  'DATETIME',
  'EMAIL',
  'PHONE',
  'URL',
  'DROPDOWN',
  'MULTI_SELECT',
  'CHECKBOX',
  'TEXTAREA',
  'CURRENCY',
  'PERCENTAGE'
];

// Transformation rules
const TRANSFORMATION_RULES = {
  'uppercase': 'Convert to Uppercase',
  'lowercase': 'Convert to Lowercase',
  'trim': 'Trim Whitespace',
  'capitalize': 'Capitalize Words',
  'date_format': 'Format Date',
  'phone_format': 'Format Phone Number',
  'currency_format': 'Format Currency',
  'strip_non_numeric': 'Remove Non-Numeric Characters',
  'default_value': 'Set Default Value',
  'concatenate': 'Concatenate Fields',
  'substring': 'Extract Substring',
  'lookup': 'Lookup Value from Table'
};

// Validation rules
const VALIDATION_RULES = {
  'required': 'Required Field',
  'email': 'Valid Email',
  'phone': 'Valid Phone Number',
  'url': 'Valid URL',
  'min_length': 'Minimum Length',
  'max_length': 'Maximum Length',
  'min_value': 'Minimum Value',
  'max_value': 'Maximum Value',
  'regex': 'Regex Pattern',
  'date_range': 'Date Range',
  'enum': 'Allowed Values'
};

// Standard system fields
const STANDARD_SOURCE_FIELDS = [
  { name: 'firstName', type: 'TEXT', label: 'First Name', category: 'contact' },
  { name: 'lastName', type: 'TEXT', label: 'Last Name', category: 'contact' },
  { name: 'email', type: 'EMAIL', label: 'Email', category: 'contact' },
  { name: 'phone', type: 'PHONE', label: 'Phone', category: 'contact' },
  { name: 'address.street', type: 'TEXT', label: 'Street Address', category: 'contact' },
  { name: 'address.city', type: 'TEXT', label: 'City', category: 'contact' },
  { name: 'address.state', type: 'TEXT', label: 'State', category: 'contact' },
  { name: 'address.postalCode', type: 'TEXT', label: 'Postal Code', category: 'contact' },
  { name: 'company', type: 'TEXT', label: 'Company', category: 'contact' },
  { name: 'jobTitle', type: 'TEXT', label: 'Job Title', category: 'contact' },
  { name: 'source', type: 'TEXT', label: 'Lead Source', category: 'contact' },
  { name: 'tags', type: 'MULTI_SELECT', label: 'Tags', category: 'contact' },
  { name: 'notes', type: 'TEXTAREA', label: 'Notes', category: 'contact' },
  { name: 'weddingDate', type: 'DATE', label: 'Wedding Date', category: 'event' },
  { name: 'eventDate', type: 'DATE', label: 'Event Date', category: 'event' },
  { name: 'eventType', type: 'DROPDOWN', label: 'Event Type', category: 'event' },
  { name: 'guestCount', type: 'NUMBER', label: 'Guest Count', category: 'event' },
  { name: 'budget', type: 'CURRENCY', label: 'Budget', category: 'event' },
  { name: 'venueName', type: 'TEXT', label: 'Venue Name', category: 'venue' },
  { name: 'ceremonyTime', type: 'TEXT', label: 'Ceremony Time', category: 'event' },
  { name: 'venueSelectionStatus', type: 'DROPDOWN', label: 'Venue Selection Status', category: 'venue' },
  { name: 'contractValue', type: 'CURRENCY', label: 'Contract Value', category: 'contract' },
  { name: 'referralSource', type: 'TEXT', label: 'Referral Source', category: 'marketing' },
  { name: 'leadScore', type: 'NUMBER', label: 'Lead Score', category: 'marketing' }
];

// Zod schema for field mapping validation
const fieldMappingSchema = z.object({
  sourceField: z.string().min(1).max(255),
  sourceFieldType: z.enum(FIELD_TYPES),
  targetField: z.string().min(1).max(255),
  targetFieldType: z.enum(FIELD_TYPES),
  targetSystem: z.string().default('gohighlevel'),
  transformationRule: z.string().optional().nullable(),
  validationRule: z.string().optional().nullable(),
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  description: z.string().optional().nullable(),
  exampleValue: z.string().optional().nullable()
});

const bulkMappingSchema = z.object({
  mappings: z.array(fieldMappingSchema)
});

// GET /api/clients/:clientId/field-mappings - Get all field mappings for a client
router.get('/clients/:clientId/field-mappings', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { targetSystem, isActive } = req.query;

    // First verify the client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, slug: true, name: true }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const where = { clientId };
    if (targetSystem) where.targetSystem = targetSystem;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const mappings = await prisma.fieldMapping.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { sourceField: 'asc' }
      ]
    });

    res.json({
      client: {
        id: client.id,
        slug: client.slug,
        name: client.name
      },
      mappings,
      count: mappings.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:clientId/field-mappings/:id - Get a specific field mapping
router.get('/clients/:clientId/field-mappings/:id', async (req, res, next) => {
  try {
    const { clientId, id } = req.params;

    const mapping = await prisma.fieldMapping.findFirst({
      where: { id, clientId }
    });

    if (!mapping) {
      return res.status(404).json({ error: 'Field mapping not found' });
    }

    res.json(mapping);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients/:clientId/field-mappings - Create a new field mapping
router.post('/clients/:clientId/field-mappings', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const data = fieldMappingSchema.parse(req.body);

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check for duplicate mapping
    const existing = await prisma.fieldMapping.findFirst({
      where: {
        clientId,
        sourceField: data.sourceField,
        targetSystem: data.targetSystem
      }
    });

    if (existing) {
      return res.status(409).json({
        error: 'A mapping already exists for this source field and target system',
        existingMapping: existing
      });
    }

    const mapping = await prisma.fieldMapping.create({
      data: {
        ...data,
        clientId
      }
    });

    res.status(201).json(mapping);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }
    next(error);
  }
});

// POST /api/clients/:clientId/field-mappings/bulk - Create multiple field mappings
router.post('/clients/:clientId/field-mappings/bulk', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { mappings } = bulkMappingSchema.parse(req.body);

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const results = {
      created: [],
      updated: [],
      errors: []
    };

    for (const mappingData of mappings) {
      try {
        // Check for existing mapping
        const existing = await prisma.fieldMapping.findFirst({
          where: {
            clientId,
            sourceField: mappingData.sourceField,
            targetSystem: mappingData.targetSystem
          }
        });

        if (existing) {
          // Update existing
          const updated = await prisma.fieldMapping.update({
            where: { id: existing.id },
            data: mappingData
          });
          results.updated.push(updated);
        } else {
          // Create new
          const created = await prisma.fieldMapping.create({
            data: {
              ...mappingData,
              clientId
            }
          });
          results.created.push(created);
        }
      } catch (err) {
        results.errors.push({
          sourceField: mappingData.sourceField,
          error: err.message
        });
      }
    }

    res.json({
      success: results.errors.length === 0,
      summary: {
        created: results.created.length,
        updated: results.updated.length,
        errors: results.errors.length
      },
      ...results
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }
    next(error);
  }
});

// PUT /api/clients/:clientId/field-mappings/:id - Update a field mapping
router.put('/clients/:clientId/field-mappings/:id', async (req, res, next) => {
  try {
    const { clientId, id } = req.params;
    const data = fieldMappingSchema.partial().parse(req.body);

    // Verify mapping exists and belongs to client
    const existing = await prisma.fieldMapping.findFirst({
      where: { id, clientId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Field mapping not found' });
    }

    const mapping = await prisma.fieldMapping.update({
      where: { id },
      data
    });

    res.json(mapping);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }
    next(error);
  }
});

// DELETE /api/clients/:clientId/field-mappings/:id - Delete a field mapping
router.delete('/clients/:clientId/field-mappings/:id', async (req, res, next) => {
  try {
    const { clientId, id } = req.params;

    // Verify mapping exists and belongs to client
    const existing = await prisma.fieldMapping.findFirst({
      where: { id, clientId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Field mapping not found' });
    }

    await prisma.fieldMapping.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/field-mappings/metadata - Get metadata for field mapping UI
router.get('/field-mappings/metadata', async (req, res) => {
  res.json({
    fieldTypes: FIELD_TYPES,
    transformationRules: TRANSFORMATION_RULES,
    validationRules: VALIDATION_RULES,
    standardSourceFields: STANDARD_SOURCE_FIELDS,
    targetSystems: ['gohighlevel', 'airtable', 'hubspot', 'salesforce']
  });
});

// POST /api/clients/:clientId/field-mappings/validate - Validate data against mappings
router.post('/clients/:clientId/field-mappings/validate', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { data } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Data object is required' });
    }

    // Get active mappings for client
    const mappings = await prisma.fieldMapping.findMany({
      where: {
        clientId,
        isActive: true
      }
    });

    const validationResults = {
      valid: true,
      errors: [],
      warnings: [],
      transformed: {}
    };

    for (const mapping of mappings) {
      const sourceValue = data[mapping.sourceField];
      
      // Check required fields
      if (mapping.isRequired && (sourceValue === undefined || sourceValue === null || sourceValue === '')) {
        validationResults.valid = false;
        validationResults.errors.push({
          field: mapping.sourceField,
          message: `Required field "${mapping.sourceField}" is missing`
        });
        continue;
      }

      // Skip validation if value is empty and not required
      if (!sourceValue && !mapping.isRequired) {
        continue;
      }

      // Apply transformation if specified
      let transformedValue = sourceValue;
      if (mapping.transformationRule && sourceValue) {
        transformedValue = applyTransformation(sourceValue, mapping.transformationRule, mapping.sourceFieldType);
      }

      // Apply validation if specified
      if (mapping.validationRule) {
        const validation = validateValue(transformedValue, mapping.validationRule, mapping.sourceFieldType);
        if (!validation.valid) {
          validationResults.valid = false;
          validationResults.errors.push({
            field: mapping.sourceField,
            message: validation.message
          });
        }
      }

      // Store transformed value
      validationResults.transformed[mapping.targetField] = transformedValue;
    }

    res.json(validationResults);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients/:clientId/field-mappings/transform - Transform data according to mappings
router.post('/clients/:clientId/field-mappings/transform', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { data, targetSystem = 'gohighlevel' } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Data object is required' });
    }

    // Get active mappings for client
    const mappings = await prisma.fieldMapping.findMany({
      where: {
        clientId,
        isActive: true,
        targetSystem
      }
    });

    const result = {
      original: data,
      transformed: {},
      unmapped: {},
      errors: []
    };

    // Transform mapped fields
    for (const mapping of mappings) {
      const sourceValue = getNestedValue(data, mapping.sourceField);
      
      if (sourceValue !== undefined && sourceValue !== null) {
        try {
          let transformedValue = sourceValue;
          
          // Apply transformation if specified
          if (mapping.transformationRule) {
            transformedValue = applyTransformation(sourceValue, mapping.transformationRule, mapping.sourceFieldType);
          }

          // Validate if rule specified
          if (mapping.validationRule) {
            const validation = validateValue(transformedValue, mapping.validationRule, mapping.sourceFieldType);
            if (!validation.valid) {
              result.errors.push({
                field: mapping.sourceField,
                targetField: mapping.targetField,
                message: validation.message
              });
              continue;
            }
          }

          setNestedValue(result.transformed, mapping.targetField, transformedValue);
        } catch (err) {
          result.errors.push({
            field: mapping.sourceField,
            targetField: mapping.targetField,
            message: err.message
          });
        }
      }
    }

    // Collect unmapped fields
    const mappedSourceFields = new Set(mappings.map(m => m.sourceField));
    for (const key of Object.keys(data)) {
      if (!mappedSourceFields.has(key)) {
        result.unmapped[key] = data[key];
      }
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients/:clientId/field-mappings/sync-ghl - Sync custom fields from GoHighLevel
router.post('/clients/:clientId/field-mappings/sync-ghl', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { customFields } = req.body;

    if (!Array.isArray(customFields)) {
      return res.status(400).json({ error: 'customFields array is required' });
    }

    // Get existing mappings
    const existingMappings = await prisma.fieldMapping.findMany({
      where: {
        clientId,
        targetSystem: 'gohighlevel'
      }
    });

    const existingMap = new Map(
      existingMappings.map(m => [`${m.sourceField}-${m.targetField}`, m])
    );

    const results = {
      created: [],
      updated: [],
      unchanged: [],
      errors: []
    };

    for (const ghlField of customFields) {
      try {
        const sourceField = ghlField.name?.toLowerCase().replace(/\s+/g, '_') || ghlField.id;
        const key = `${sourceField}-${ghlField.id}`;

        const mappingData = {
          sourceField,
          sourceFieldType: mapGhlTypeToStandard(ghlField.dataType || ghlField.type),
          targetField: ghlField.id,
          targetFieldType: mapGhlTypeToStandard(ghlField.dataType || ghlField.type),
          targetSystem: 'gohighlevel',
          description: ghlField.name,
          isActive: true
        };

        if (existingMap.has(key)) {
          const existing = existingMap.get(key);
          const updated = await prisma.fieldMapping.update({
            where: { id: existing.id },
            data: mappingData
          });
          results.updated.push(updated);
        } else {
          const created = await prisma.fieldMapping.create({
            data: {
              ...mappingData,
              clientId
            }
          });
          results.created.push(created);
        }
      } catch (err) {
        results.errors.push({
          field: ghlField.name || ghlField.id,
          error: err.message
        });
      }
    }

    res.json({
      success: results.errors.length === 0,
      summary: {
        created: results.created.length,
        updated: results.updated.length,
        unchanged: results.unchanged.length,
        errors: results.errors.length
      },
      ...results
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function applyTransformation(value, rule, fieldType) {
  if (value === null || value === undefined) return value;
  
  const strValue = String(value);
  
  switch (rule) {
    case 'uppercase':
      return strValue.toUpperCase();
    case 'lowercase':
      return strValue.toLowerCase();
    case 'trim':
      return strValue.trim();
    case 'capitalize':
      return strValue.replace(/\b\w/g, l => l.toUpperCase());
    case 'strip_non_numeric':
      return strValue.replace(/\D/g, '');
    case 'phone_format':
      const digits = strValue.replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      return strValue;
    default:
      return value;
  }
}

function validateValue(value, rule, fieldType) {
  if (value === null || value === undefined) {
    return { valid: true };
  }

  const strValue = String(value);

  switch (rule) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        valid: emailRegex.test(strValue),
        message: emailRegex.test(strValue) ? null : 'Invalid email format'
      };
    case 'phone':
      const digits = strValue.replace(/\D/g, '');
      return {
        valid: digits.length >= 10,
        message: digits.length >= 10 ? null : 'Phone number must have at least 10 digits'
      };
    case 'url':
      try {
        new URL(strValue);
        return { valid: true };
      } catch {
        return { valid: false, message: 'Invalid URL format' };
      }
    case 'min_length':
      return {
        valid: strValue.length >= 1,
        message: strValue.length >= 1 ? null : 'Value is too short'
      };
    default:
      return { valid: true };
  }
}

function mapGhlTypeToStandard(ghlType) {
  const typeMap = {
    'TEXT': 'TEXT',
    'NUMBER': 'NUMBER',
    'DATE': 'DATE',
    'DATE_TIME': 'DATETIME',
    'PHONE': 'PHONE',
    'EMAIL': 'EMAIL',
    'URL': 'URL',
    'SINGLE_SELECT': 'DROPDOWN',
    'MULTI_SELECT': 'MULTI_SELECT',
    'CHECKBOX': 'CHECKBOX',
    'TEXTAREA': 'TEXTAREA',
    'CURRENCY': 'CURRENCY'
  };
  return typeMap[ghlType] || 'TEXT';
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

export { router as fieldMappingsRouter };
