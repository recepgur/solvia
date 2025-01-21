use anchor_lang::prelude::*;
mod message;
use message::*;

declare_id!("Tchat111111111111111111111111111111111111111");

#[program]
pub mod tchat {
    use super::*;

    pub fn send_direct_message(
        ctx: Context<SendMessage>,
        receiver: Pubkey,
        message_hash: String,
        encryption_key: String,
        is_media: bool,
        media_type: String,
    ) -> Result<()> {
        ctx.accounts.message_account.initialize(
            *ctx.accounts.sender.key,
            receiver,
            message_hash,
            encryption_key,
            is_media,
            media_type,
            false,
            None,
        )
    }

    pub fn send_group_message(
        ctx: Context<SendMessage>,
        receiver: Pubkey,
        message_hash: String,
        encryption_key: String,
        is_media: bool,
        media_type: String,
        group_id: Pubkey,
    ) -> Result<()> {
        ctx.accounts.message_account.initialize(
            *ctx.accounts.sender.key,
            receiver,
            message_hash,
            encryption_key,
            is_media,
            media_type,
            true,
            Some(group_id),
        )
    }
}
