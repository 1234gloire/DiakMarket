import 'category.dart';
import 'city.dart';
import 'country.dart';
import 'profile.dart';

class ProductImage {
  final String id;
  final String url;
  final String publicId;
  final bool isPrimary;
  final int sortOrder;

  const ProductImage({
    required this.id,
    required this.url,
    required this.publicId,
    required this.isPrimary,
    required this.sortOrder,
  });

  factory ProductImage.fromJson(Map<String, dynamic> json) => ProductImage(
        id: json['id'] as String,
        url: json['url'] as String,
        publicId: json['publicId'] as String,
        isPrimary: json['isPrimary'] as bool? ?? false,
        sortOrder: json['sortOrder'] as int? ?? 0,
      );
}

enum ProductCondition { NEW, LIKE_NEW, GOOD, FAIR, POOR }

ProductCondition productConditionFromJson(String? value) => ProductCondition.values.firstWhere(
      (c) => c.name == value,
      orElse: () => ProductCondition.GOOD,
    );

extension ProductConditionLabel on ProductCondition {
  String get label => switch (this) {
        ProductCondition.NEW => 'Neuf',
        ProductCondition.LIKE_NEW => 'Comme neuf',
        ProductCondition.GOOD => 'Bon état',
        ProductCondition.FAIR => 'État correct',
        ProductCondition.POOR => 'Usé',
      };
}

class Product {
  final String id;
  final String sellerId;
  final String categoryId;
  final String countryId;
  final String? cityId;
  final String title;
  final String description;
  final int price;
  final String currencyCode;
  final ProductCondition condition;
  final String? brand;
  final String? size;
  final String? color;
  final int quantity;
  final String status;
  final List<ProductImage> images;
  final Category? category;
  final Country? country;
  final City? city;
  final SellerSummary? seller;

  const Product({
    required this.id,
    required this.sellerId,
    required this.categoryId,
    required this.countryId,
    required this.title,
    required this.description,
    required this.price,
    required this.currencyCode,
    required this.condition,
    required this.quantity,
    required this.status,
    this.cityId,
    this.brand,
    this.size,
    this.color,
    this.images = const [],
    this.category,
    this.country,
    this.city,
    this.seller,
  });

  ProductImage? get primaryImage {
    if (images.isEmpty) return null;
    return images.firstWhere((i) => i.isPrimary, orElse: () => images.first);
  }

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        sellerId: json['sellerId'] as String,
        categoryId: json['categoryId'] as String,
        countryId: json['countryId'] as String,
        cityId: json['cityId'] as String?,
        title: json['title'] as String,
        description: json['description'] as String,
        price: json['price'] as int,
        currencyCode: json['currencyCode'] as String,
        condition: productConditionFromJson(json['condition'] as String?),
        brand: json['brand'] as String?,
        size: json['size'] as String?,
        color: json['color'] as String?,
        quantity: json['quantity'] as int? ?? 1,
        status: json['status'] as String? ?? 'ACTIVE',
        images: (json['images'] as List<dynamic>? ?? [])
            .map((i) => ProductImage.fromJson(i as Map<String, dynamic>))
            .toList(),
        category: json['category'] != null ? Category.fromJson(json['category'] as Map<String, dynamic>) : null,
        country: json['country'] != null ? Country.fromJson(json['country'] as Map<String, dynamic>) : null,
        city: json['city'] != null ? City.fromJson(json['city'] as Map<String, dynamic>) : null,
        seller: json['seller'] != null ? SellerSummary.fromJson(json['seller'] as Map<String, dynamic>) : null,
      );
}
