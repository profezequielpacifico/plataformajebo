import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS, TRANSITIONS } from './theme/index.js';

export const errorBox = {
    color: COLORS.danger,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md
};

export const warningBox = {
    color: '#92400e',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: '#fef3c7',
    borderRadius: RADIUS.md
};

export const infoBox = {
    color: '#1e40af',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: '#dbeafe',
    borderRadius: RADIUS.md
};

export const successBox = {
    color: COLORS.success,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: '#dcfce7',
    borderRadius: RADIUS.md
};

export const formGroup = {
    marginBottom: SPACING.md
};

export const formLabel = {
    display: 'block',
    marginBottom: SPACING.xs,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.text
};

export const formInput = {
    width: '100%',
    padding: SPACING.sm,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    minHeight: '44px',
    fontSize: '16px'
};

export const formSelect = {
    width: '100%',
    padding: SPACING.sm,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    minHeight: '44px',
    fontSize: '16px'
};

export const formTextarea = {
    ...formInput,
    height: '82px',
    resize: 'vertical'
};

export const formGrid = {
    display: 'grid',
    gap: SPACING.xl
};

export const formRow = {
    display: 'flex',
    gap: SPACING.lg,
    flexWrap: 'wrap',
    alignItems: 'flex-end'
};

export const formActions = {
    display: 'flex',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    flexWrap: 'wrap'
};

export const filterRow = {
    display: 'flex',
    gap: SPACING.md,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg
};

export const filterGroup = {
    ...formGroup,
    marginBottom: 0,
    minWidth: '180px'
};

export const tableCellBold = {
    fontWeight: TYPOGRAPHY.weights.semibold
};

export const tableCellCenter = {
    textAlign: 'center'
};

export const tableCellRight = {
    textAlign: 'right'
};

export const emptyTableCell = (colSpan, text = 'Sin datos', isLoading = false) => ({
    colSpan,
    style: {
        textAlign: 'center',
        color: COLORS.textMuted,
        padding: SPACING.xl
    },
    children: isLoading ? 'Cargando...' : text
});

export const emptyTableCellCenter = {
    textAlign: 'center',
    color: COLORS.textMuted,
    padding: SPACING.xl
};

export const buttonPrimary = {
    padding: '12px 20px',
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    border: 'none',
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.default,
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
};

export const buttonOutline = {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: COLORS.primary,
    border: `1px solid ${COLORS.primary}`,
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.default,
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
};

export const buttonSuccess = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.success,
    color: COLORS.white,
    border: 'none',
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.default
};

export const buttonDanger = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.danger,
    color: COLORS.white,
    border: 'none',
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.default
};

export const buttonInfo = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: '#3b82f6',
    color: COLORS.white,
    border: 'none',
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.default
};

export const buttonSmall = {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    fontSize: TYPOGRAPHY.sizes.sm,
    borderRadius: RADIUS.sm
};

export const buttonPrimarySmall = {
    ...buttonPrimary,
    ...buttonSmall
};

export const buttonOutlineSmall = {
    ...buttonOutline,
    ...buttonSmall
};

export const buttonDangerSmall = {
    ...buttonDanger,
    ...buttonSmall
};

export const buttonSuccessSmall = {
    ...buttonSuccess,
    ...buttonSmall
};

export const buttonWithIcon = (baseStyle = {}) => ({
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    ...baseStyle
});

export const modalActions = {
    display: 'flex',
    gap: SPACING.sm,
    justifyContent: 'flex-end',
    marginTop: SPACING.lg
};

export const pageContainer = {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: SPACING.lg
};

export const pageHeader = {
    marginBottom: SPACING.xl
};

export const pageTitle = {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    margin: '0 0 8px 0'
};

export const pageSubtitle = {
    margin: 0,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted
};

export const sectionTitle = {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg
};

export const card = {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    boxShadow: SHADOWS.sm,
    overflow: 'hidden',
    margin: '0 0 20px 0',
};

export const cardContainer = {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    boxShadow: SHADOWS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.lg
};

export const cardContent = {
    padding: SPACING.lg
};

export const loadingContainer = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: COLORS.background
};

export const loadingText = {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.base
};

export const emptyState = {
    textAlign: 'center',
    color: COLORS.textMuted,
    padding: SPACING.xl * 2
};

export const successContainer = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    textAlign: 'center'
};

export const successTitle = {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.success,
    marginBottom: SPACING.sm
};

export const successText = {
    fontSize: TYPOGRAPHY.sizes.base,
    color: COLORS.text,
    marginBottom: SPACING.xl
};

export const successButton = {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    border: 'none',
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    cursor: 'pointer'
};

export const savingBox = {
    backgroundColor: COLORS.saving,
    color: '#1e293b',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium
};

export const errorBoxLight = {
    backgroundColor: COLORS.dangerLight,
    color: '#1e293b',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.sizes.sm
};

export const errorBoxDark = {
    backgroundColor: COLORS.danger,
    color: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium
};

export const table = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    boxShadow: SHADOWS.sm,
    fontSize: '14px',
};

export const tableHeaderCell = {
    padding: SPACING.sm,
    textAlign: 'left',
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.text,
    borderBottom: `1px solid ${COLORS.border}`,
    whiteSpace: 'nowrap',
};

export const tableCell = {
    padding: SPACING.sm,
    color: COLORS.text,
};

export const tableActions = {
    display: 'flex',
    gap: SPACING.xs
};

export const statsGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl
};

export const statCard = {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    boxShadow: SHADOWS.sm
};

export const statLabel = {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs
};

export const statValue = {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary
};

export const badge = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: RADIUS.sm,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: 'uppercase'
};

export const badgeGreen = {
    backgroundColor: '#22c55e',
    color: 'white'
};

export const badgeYellow = {
    backgroundColor: '#f59e0b',
    color: 'white'
};

export const badgeRed = {
    backgroundColor: '#f44336',
    color: 'white'
};

export const badgeBlue = {
    backgroundColor: '#2196f3',
    color: 'white'
};

export const badgeOrange = {
    backgroundColor: '#ff9800',
    color: 'white'
};

export const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
};

export const modal = {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    maxWidth: '500px',
    width: '90%',
    boxShadow: SHADOWS.lg
};

export const modalTitle = {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
    margin: `0 0 ${SPACING.md} 0`
};

export const modalText = {
    color: COLORS.text,
    marginBottom: SPACING.lg
};

export const modalButtons = {
    display: 'flex',
    gap: SPACING.sm,
    justifyContent: 'flex-end'
};

export const visuallyHidden = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0
};

export const flexBetween = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

export const flexCenter = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

export const flexGap = (gap = SPACING.md) => ({
    display: 'flex',
    gap,
    flexWrap: 'wrap'
});

export const truncateText = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '300px'
};