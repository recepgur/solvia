export const FEE_TYPES = {
    SERVICE_FEE: 'SERVICE_FEE',
    PREMIUM_SUBSCRIPTION: 'PREMIUM_SUBSCRIPTION',
    GROUP_CALL_FEE: 'GROUP_CALL_FEE',
    RECORDING_FEE: 'RECORDING_FEE',
    CUSTOM_FEE: 'CUSTOM_FEE'
};

// Solvio Token Configuration
export const SOLVIO_TOKEN = {
    MINT_ADDRESS: 'CzNeEEPiGXutW2kx2HQyy3peD7763iEiYYEMxxbKyYX2', // From metadata.json
    DECIMALS: 9,
    SYMBOL: 'SOLV'
};

// Fee amounts in SOLV tokens (adjusted for decimals)
export const SOLANA_FEES = {
    [FEE_TYPES.SERVICE_FEE]: 1_000_000,        // 0.001 SOLV
    [FEE_TYPES.PREMIUM_SUBSCRIPTION]: 10_000_000, // 0.01 SOLV
    [FEE_TYPES.GROUP_CALL_FEE]: 2_000_000,     // 0.002 SOLV
    [FEE_TYPES.RECORDING_FEE]: 3_000_000       // 0.003 SOLV
};

// Program IDs
export const PROGRAM_IDS = {
    TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Solana Token Program
    ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'  // Associated Token Program
};
