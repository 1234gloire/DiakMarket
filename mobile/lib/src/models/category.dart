class Category {
  final String id;
  final String? parentId;
  final String name;
  final String slug;
  final String? iconUrl;
  final List<Category> children;

  const Category({
    required this.id,
    required this.name,
    required this.slug,
    this.parentId,
    this.iconUrl,
    this.children = const [],
  });

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        parentId: json['parentId'] as String?,
        name: json['name'] as String,
        slug: json['slug'] as String,
        iconUrl: json['iconUrl'] as String?,
        children: (json['children'] as List<dynamic>? ?? [])
            .map((c) => Category.fromJson(c as Map<String, dynamic>))
            .toList(),
      );
}
