// Meta Messenger API utility
const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!;
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN!;

// Send message to specific user
export async function sendMessage(recipientId: string, message: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${META_PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      })
    });

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending Meta message:', error);
    throw error;
  }
}

// Send broadcast message to multiple users
export async function sendBroadcast(message: string, recipientIds: string[]) {
  const results = [];
  
  for (const recipientId of recipientIds) {
    try {
      const result = await sendMessage(recipientId, message);
      results.push({ recipientId, success: true, result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ recipientId, success: false, error: errorMessage });
    }
  }
  
  return results;
}

// Message templates
export const messageTemplates = {
  weeklyReminder: (userName: string, amount: number, dueDate: string) => 
    ` Nhắc nhở đóng góp tuần\n\nXin chào ${userName}!\n\nBạn cần đóng góp ${amount.toLocaleString('vi-VN')} VNĐ cho tuần này.\nHạn chót: ${dueDate}\n\nVui lòng chuyển khoản vào tài khoản Momo của nhóm với nội dung: "QUY ${userName} ${amount}"`,
  
  overdueNotice: (userName: string, amount: number, penalty: number) => 
    `⚠️ Thông báo quá hạn\n\nXin chào ${userName}!\n\nBạn đã quá hạn đóng góp ${amount.toLocaleString('vi-VN')} VNĐ.\nPhạt quá hạn: ${penalty.toLocaleString('vi-VN')} VNĐ\n\nVui lòng liên hệ admin để xử lý.`,
  
  paymentConfirmed: (userName: string, amount: number) => 
    `✅ Xác nhận thanh toán\n\nXin chào ${userName}!\n\nĐã xác nhận bạn đã đóng góp ${amount.toLocaleString('vi-VN')} VNĐ.\nCảm ơn bạn đã tham gia!`,
  
  monthlyStats: (userName: string, totalPaid: number, totalOwed: number) => 
    `📊 Thống kê tháng\n\nXin chào ${userName}!\n\nTổng đã đóng: ${totalPaid.toLocaleString('vi-VN')} VNĐ\nTổng còn nợ: ${totalOwed.toLocaleString('vi-VN')} VNĐ\n\nCảm ơn bạn đã tham gia!`
};

// Verify webhook
export function verifyWebhook(mode: string, token: string, challenge: string) {
  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}