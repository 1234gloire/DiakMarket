class PaymentTransaction {
  final String id;
  final String orderId;
  final String provider;
  final String? providerReference;
  final int amount;
  final String currencyCode;
  final String status;

  const PaymentTransaction({
    required this.id,
    required this.orderId,
    required this.provider,
    required this.amount,
    required this.currencyCode,
    required this.status,
    this.providerReference,
  });

  factory PaymentTransaction.fromJson(Map<String, dynamic> json) => PaymentTransaction(
        id: json['id'] as String,
        orderId: json['orderId'] as String,
        provider: json['provider'] as String,
        providerReference: json['providerReference'] as String?,
        amount: json['amount'] as int,
        currencyCode: json['currencyCode'] as String,
        status: json['status'] as String,
      );
}
