class Profile {
  final String displayName;
  final String? avatarUrl;
  final String? bio;
  final double ratingAvg;
  final int ratingCount;
  final int salesCount;

  const Profile({
    required this.displayName,
    this.avatarUrl,
    this.bio,
    this.ratingAvg = 0,
    this.ratingCount = 0,
    this.salesCount = 0,
  });

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
        displayName: json['displayName'] as String? ?? 'Utilisateur',
        avatarUrl: json['avatarUrl'] as String?,
        bio: json['bio'] as String?,
        ratingAvg: (json['ratingAvg'] as num?)?.toDouble() ?? 0,
        ratingCount: json['ratingCount'] as int? ?? 0,
        salesCount: json['salesCount'] as int? ?? 0,
      );
}

class SellerSummary {
  final String id;
  final Profile? profile;

  const SellerSummary({required this.id, this.profile});

  factory SellerSummary.fromJson(Map<String, dynamic> json) => SellerSummary(
        id: json['id'] as String,
        profile: json['profile'] != null ? Profile.fromJson(json['profile'] as Map<String, dynamic>) : null,
      );
}
