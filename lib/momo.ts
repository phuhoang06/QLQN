import crypto from 'crypto'

export interface MomoPaymentRequest {
  partnerCode: string
  accessKey: string
  requestId: string
  amount: number
  orderId: string
  orderInfo: string
  redirectUrl: string
  ipnUrl: string
  extraData: string
  requestType: string
  signature: string
}

export interface MomoPaymentResponse {
  partnerCode: string
  accessKey: string
  requestId: string
  amount: number
  orderId: string
  orderInfo: string
  redirectUrl: string
  ipnUrl: string
  extraData: string
  requestType: string
  signature: string
  payUrl?: string
  deeplink?: string
  qrCodeUrl?: string
  deeplinkWebInApp?: string
  resultCode: number
  message: string
}

export interface MomoWebhookData {
  partnerCode: string
  accessKey: string
  requestId: string
  amount: number
  orderId: string
  orderInfo: string
  orderType: string
  transId: string
  resultCode: number
  message: string
  payType: string
  responseTime: number
  extraData: string
  signature: string
}

class MomoPayment {
  private partnerCode: string
  private accessKey: string
  private secretKey: string
  private environment: string
  private baseUrl: string

  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE || ''
    this.accessKey = process.env.MOMO_ACCESS_KEY || ''
    this.secretKey = process.env.MOMO_SECRET_KEY || ''
    this.environment = process.env.MOMO_ENVIRONMENT || 'sandbox'
    
    this.baseUrl = this.environment === 'production' 
      ? 'https://payment.momo.vn/v2/gateway/api'
      : 'https://test-payment.momo.vn/v2/gateway/api'
  }

  private generateSignature(data: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex')
  }

  private generateRequestId(): string {
    return Date.now().toString()
  }

  async createPayment(
    amount: number,
    orderId: string,
    orderInfo: string,
    returnUrl: string,
    notifyUrl: string,
    extraData: string = ''
  ): Promise<MomoPaymentResponse> {
    const requestId = this.generateRequestId()
    
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=captureWallet`
    
    const signature = this.generateSignature(rawSignature)

    const requestData: MomoPaymentRequest = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      extraData,
      requestType: 'captureWallet',
      signature
    }

    try {
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()
      return result as MomoPaymentResponse
    } catch (error) {
      console.error('Momo payment creation error:', error)
      throw new Error('Không thể tạo thanh toán Momo')
    }
  }

  verifyWebhookSignature(webhookData: MomoWebhookData): boolean {
    const {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = webhookData

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`

    const expectedSignature = this.generateSignature(rawSignature)
    return signature === expectedSignature
  }

  async queryPaymentStatus(orderId: string, requestId: string): Promise<any> {
    const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`
    const signature = this.generateSignature(rawSignature)

    const requestData = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId,
      orderId,
      signature
    }

    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Momo payment query error:', error)
      throw new Error('Không thể kiểm tra trạng thái thanh toán')
    }
  }
}

export const momoPayment = new MomoPayment()


