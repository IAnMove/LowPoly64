import { AVATAR_ACCESSORY_PRESETS } from './accessory-presets.js';
import { AVATAR_BROW_PRESETS } from './brow-presets.js';
import { AVATAR_EAR_PRESETS } from './ear-presets.js';
import { AVATAR_EYE_PRESETS } from './eye-presets.js';
import { AVATAR_HAIR_PRESETS } from './hair-presets.js';
import { AVATAR_HEAD_MOLDS } from './head-molds.js';
import { AVATAR_MOUTH_PRESETS } from './mouth-presets.js';
import { AVATAR_NOSE_PRESETS } from './nose-presets.js';
import { AVATAR_PALETTES } from './palettes.js';
import {
  AVATAR_MOLD_LIBRARY_REQUIRED_FIELDS,
  AVATAR_MOLD_LIBRARY_TARGETS_BY_TYPE,
  AVATAR_MOLD_LIBRARY_TYPE_CONFIG,
  AVATAR_MOLD_LIBRARY_TYPES,
} from './mold-style-library.js';
import {
  AVATAR_STYLE_FAMILIES,
  AVATAR_STYLE_LIBRARY_MINIMUMS,
  AVATAR_STYLE_LIBRARY_REQUIRED_FIELDS,
  AVATAR_STYLE_LIBRARY_TYPE_CONFIG,
  AVATAR_STYLE_LIBRARY_TARGETS_BY_TYPE,
  AVATAR_STYLE_TYPES,
} from './style-library.js';

const SYSTEM_PRESET_IDS_BY_TYPE = Object.freeze({
  hair: Object.freeze(['none_01']),
  eyes: Object.freeze(['none_01']),
  brows: Object.freeze(['none_01']),
  mouth: Object.freeze(['none_01']),
  accessory: Object.freeze(['none']),
});

const RUNTIME_PRESETS_BY_TYPE = Object.freeze({
  hair: AVATAR_HAIR_PRESETS,
  eyes: AVATAR_EYE_PRESETS,
  brows: AVATAR_BROW_PRESETS,
  mouth: AVATAR_MOUTH_PRESETS,
  accessory: AVATAR_ACCESSORY_PRESETS,
  palette: AVATAR_PALETTES,
});

const MOLD_RUNTIME_PRESETS_BY_TYPE = Object.freeze({
  headMold: AVATAR_HEAD_MOLDS,
  nose: AVATAR_NOSE_PRESETS,
  ears: AVATAR_EAR_PRESETS,
});

function getRuntimePresetIds(type) {
  const entries = RUNTIME_PRESETS_BY_TYPE[type] || [];
  const excludedIds = new Set(SYSTEM_PRESET_IDS_BY_TYPE[type] || []);
  return entries
    .map((entry) => entry.id)
    .filter((id) => typeof id === 'string' && !excludedIds.has(id));
}

function countFamilies(entries) {
  const counts = Object.fromEntries(AVATAR_STYLE_FAMILIES.map((family) => [family, 0]));
  entries.forEach((entry) => {
    if (counts[entry.family] !== undefined) counts[entry.family] += 1;
  });
  return counts;
}

function findMissingMetadata(entry) {
  return AVATAR_STYLE_LIBRARY_REQUIRED_FIELDS.filter((field) => {
    const value = entry[field];
    if (typeof value === 'string') return value.trim().length === 0;
    return value === null || value === undefined;
  });
}

function findMissingFields(entry, requiredFields) {
  return requiredFields.filter((field) => {
    const value = entry[field];
    if (typeof value === 'string') return value.trim().length === 0;
    return value === null || value === undefined;
  });
}

function buildTypeReport(type, options = {}) {
  const {
    runtimePresetsByType,
    targetsByType,
    minimums,
    families = AVATAR_STYLE_FAMILIES,
    requiredFields = AVATAR_STYLE_LIBRARY_REQUIRED_FIELDS,
    typeConfig = {},
  } = options;

  const targetEntries = targetsByType[type] || [];
  const entries = runtimePresetsByType[type] || [];
  const excludedIds = new Set(SYSTEM_PRESET_IDS_BY_TYPE[type] || []);
  const runtimeIds = entries
    .map((entry) => entry.id)
    .filter((id) => typeof id === 'string' && !excludedIds.has(id));
  const runtimeIdSet = new Set(runtimeIds);
  const targetIdSet = new Set(targetEntries.map((entry) => entry.id));
  const config = typeConfig[type] || {};
  const missingMetadata = targetEntries
    .map((entry) => ({ id: entry.id, fields: findMissingFields(entry, requiredFields) }))
    .filter((entry) => entry.fields.length > 0);
  const requireFamilyCoverage = config.requireFamilyCoverage !== false;
  const missingFamiliesInPlan = requireFamilyCoverage
    ? families.filter((family) => !targetEntries.some((entry) => entry.family === family))
    : [];
  const implementedTargetEntries = targetEntries.filter((entry) => runtimeIdSet.has(entry.id));
  const pendingTargetIds = targetEntries
    .map((entry) => entry.id)
    .filter((id) => !runtimeIdSet.has(id));
  const runtimeExtraIds = runtimeIds.filter((id) => !targetIdSet.has(id));

  return {
    minimumTarget: minimums[type] || 0,
    targetCount: targetEntries.length,
    runtimeCount: runtimeIds.length,
    targetFamilyCoverage: countFamilies(targetEntries),
    runtimeFamilyCoverage: countFamilies(implementedTargetEntries),
    missingFamiliesInPlan,
    missingMetadata,
    implementedTargetIds: implementedTargetEntries.map((entry) => entry.id),
    pendingTargetIds,
    runtimeExtraIds,
    requireFamilyCoverage,
  };
}

export function buildAvatarStyleLibraryAudit() {
  const byType = {};
  const moldByType = {};
  const issues = [];
  let totalTargetCount = 0;
  let totalRuntimeCount = 0;
  let moldTotalTargetCount = 0;
  let moldTotalRuntimeCount = 0;

  AVATAR_STYLE_TYPES.forEach((type) => {
    const typeReport = buildTypeReport(type, {
      runtimePresetsByType: RUNTIME_PRESETS_BY_TYPE,
      targetsByType: AVATAR_STYLE_LIBRARY_TARGETS_BY_TYPE,
      minimums: AVATAR_STYLE_LIBRARY_MINIMUMS,
      typeConfig: AVATAR_STYLE_LIBRARY_TYPE_CONFIG,
    });

    if (typeReport.targetCount < typeReport.minimumTarget) {
      issues.push({
        severity: 'error',
        type,
        code: 'minimum_target_not_met',
        detail: `Planned target count ${typeReport.targetCount} is below minimum ${typeReport.minimumTarget}.`,
      });
    }
    if (typeReport.missingFamiliesInPlan.length > 0) {
      issues.push({
        severity: 'error',
        type,
        code: 'missing_family_coverage',
        detail: `Missing planned family coverage for ${typeReport.missingFamiliesInPlan.join(', ')}.`,
      });
    }
    if (typeReport.missingMetadata.length > 0) {
      issues.push({
        severity: 'error',
        type,
        code: 'missing_metadata',
        detail: `${typeReport.missingMetadata.length} target entries are missing required metadata fields.`,
      });
    }
    if (typeReport.pendingTargetIds.length > 0) {
      issues.push({
        severity: 'warning',
        type,
        code: 'runtime_incomplete',
        detail: `${typeReport.pendingTargetIds.length} planned presets are not implemented in the runtime catalog yet.`,
      });
    }
    if (typeReport.runtimeExtraIds.length > 0) {
      issues.push({
        severity: 'warning',
        type,
        code: 'runtime_extra',
        detail: `${typeReport.runtimeExtraIds.length} runtime presets are not mapped into the canonical target library.`,
      });
    }

    totalTargetCount += typeReport.targetCount;
    totalRuntimeCount += typeReport.runtimeCount;
    byType[type] = typeReport;
  });

  AVATAR_MOLD_LIBRARY_TYPES.forEach((type) => {
    const typeReport = buildTypeReport(type, {
      runtimePresetsByType: MOLD_RUNTIME_PRESETS_BY_TYPE,
      targetsByType: AVATAR_MOLD_LIBRARY_TARGETS_BY_TYPE,
      minimums: Object.fromEntries(
        AVATAR_MOLD_LIBRARY_TYPES.map((entryType) => [entryType, AVATAR_MOLD_LIBRARY_TYPE_CONFIG[entryType]?.minimumTarget || 0])
      ),
      requiredFields: AVATAR_MOLD_LIBRARY_REQUIRED_FIELDS,
      typeConfig: AVATAR_MOLD_LIBRARY_TYPE_CONFIG,
    });

    if (typeReport.targetCount < typeReport.minimumTarget) {
      issues.push({
        severity: 'error',
        type,
        code: 'mold_minimum_target_not_met',
        detail: `Planned mold target count ${typeReport.targetCount} is below minimum ${typeReport.minimumTarget}.`,
      });
    }
    if (typeReport.missingMetadata.length > 0) {
      issues.push({
        severity: 'error',
        type,
        code: 'mold_missing_metadata',
        detail: `${typeReport.missingMetadata.length} mold target entries are missing required metadata fields.`,
      });
    }
    if (typeReport.pendingTargetIds.length > 0) {
      issues.push({
        severity: 'warning',
        type,
        code: 'mold_runtime_incomplete',
        detail: `${typeReport.pendingTargetIds.length} planned mold presets are not implemented in the runtime catalog yet.`,
      });
    }
    if (typeReport.runtimeExtraIds.length > 0) {
      issues.push({
        severity: 'warning',
        type,
        code: 'mold_runtime_extra',
        detail: `${typeReport.runtimeExtraIds.length} runtime mold presets are not mapped into the mold target library.`,
      });
    }

    moldTotalTargetCount += typeReport.targetCount;
    moldTotalRuntimeCount += typeReport.runtimeCount;
    moldByType[type] = typeReport;
  });

  return {
    summary: {
      typeCount: AVATAR_STYLE_TYPES.length,
      totalTargetCount,
      totalRuntimeCount,
      moldTypeCount: AVATAR_MOLD_LIBRARY_TYPES.length,
      moldTotalTargetCount,
      moldTotalRuntimeCount,
      blockingIssueCount: issues.filter((issue) => issue.severity === 'error').length,
      warningCount: issues.filter((issue) => issue.severity === 'warning').length,
    },
    byType,
    moldByType,
    issues,
  };
}

export function formatAvatarStyleLibraryAudit(report = buildAvatarStyleLibraryAudit()) {
  const lines = [
    'Avatar style library audit',
    `Types: ${report.summary.typeCount}`,
    `Target presets: ${report.summary.totalTargetCount}`,
    `Runtime presets: ${report.summary.totalRuntimeCount}`,
    `Mold types: ${report.summary.moldTypeCount}`,
    `Mold targets: ${report.summary.moldTotalTargetCount}`,
    `Mold runtime presets: ${report.summary.moldTotalRuntimeCount}`,
    `Blocking issues: ${report.summary.blockingIssueCount}`,
    `Warnings: ${report.summary.warningCount}`,
    '',
  ];

  AVATAR_STYLE_TYPES.forEach((type) => {
    const typeReport = report.byType[type];
    lines.push(
      `${type}: target ${typeReport.targetCount}/${typeReport.minimumTarget}, runtime ${typeReport.runtimeCount}, pending ${typeReport.pendingTargetIds.length}, extras ${typeReport.runtimeExtraIds.length}`
    );
    lines.push(
      `  families target ${AVATAR_STYLE_FAMILIES.map((family) => `${family}:${typeReport.targetFamilyCoverage[family] || 0}`).join(' ')}`
    );
    lines.push(
      `  families runtime ${AVATAR_STYLE_FAMILIES.map((family) => `${family}:${typeReport.runtimeFamilyCoverage[family] || 0}`).join(' ')}`
    );
    if (typeReport.missingFamiliesInPlan.length > 0) {
      lines.push(`  missing plan families: ${typeReport.missingFamiliesInPlan.join(', ')}`);
    }
    if (typeReport.missingMetadata.length > 0) {
      lines.push(`  missing metadata entries: ${typeReport.missingMetadata.map((entry) => `${entry.id}(${entry.fields.join(',')})`).join(', ')}`);
    }
    if (typeReport.runtimeExtraIds.length > 0) {
      lines.push(`  runtime extras: ${typeReport.runtimeExtraIds.join(', ')}`);
    }
    lines.push('');
  });

  lines.push('Mold catalog:');
  lines.push('');

  AVATAR_MOLD_LIBRARY_TYPES.forEach((type) => {
    const typeReport = report.moldByType[type];
    lines.push(
      `${type}: target ${typeReport.targetCount}/${typeReport.minimumTarget}, runtime ${typeReport.runtimeCount}, pending ${typeReport.pendingTargetIds.length}, extras ${typeReport.runtimeExtraIds.length}`
    );
    if (typeReport.missingMetadata.length > 0) {
      lines.push(`  missing metadata entries: ${typeReport.missingMetadata.map((entry) => `${entry.id}(${entry.fields.join(',')})`).join(', ')}`);
    }
    if (typeReport.runtimeExtraIds.length > 0) {
      lines.push(`  runtime extras: ${typeReport.runtimeExtraIds.join(', ')}`);
    }
    lines.push('');
  });

  return lines.join('\n').trim();
}
