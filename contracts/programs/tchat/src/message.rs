use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

#[account]
pub struct MessageAccount {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub message_hash: String,
    pub encryption_key: String,
    pub timestamp: i64,
    pub is_media: bool,
    pub media_type: String,
    pub is_group_message: bool,
    pub group_id: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct SendMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = 8 + 32 + 32 + 256 + 256 + 8 + 1 + 32 + 1 + 32
    )]
    pub message_account: Account<'info, MessageAccount>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}

impl MessageAccount {
    pub fn initialize(
        &mut self,
        sender: Pubkey,
        receiver: Pubkey,
        message_hash: String,
        encryption_key: String,
        is_media: bool,
        media_type: String,
        is_group_message: bool,
        group_id: Option<Pubkey>,
    ) -> Result<()> {
        self.sender = sender;
        self.receiver = receiver;
        self.message_hash = message_hash;
        self.encryption_key = encryption_key;
        self.timestamp = Clock::get()?.unix_timestamp;
        self.is_media = is_media;
        self.media_type = media_type;
        self.is_group_message = is_group_message;
        self.group_id = group_id;
        Ok(())
    }
}
