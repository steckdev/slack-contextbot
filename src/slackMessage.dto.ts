export interface SlackMessageDTO {
  blocks?: any[];
  bot_profile?: any;
  is_locked?: boolean;
  latest_reply?: string;
  parent_user_id?: string;
  reply_count?: number;
  reply_users?: string[];
  reply_users_count?: number;
  subscribed?: boolean;
  subtype: string;
  team: string;
  text: string;
  thread_ts: string;
  ts: string;
  type: string;
  user: string;
}
