import 'profile.dart';

class AppUser {
  final String id;
  final String? email;
  final String? phone;
  final List<String> roles;
  final String status;
  final String? countryId;
  final Profile? profile;

  const AppUser({
    required this.id,
    required this.roles,
    required this.status,
    this.email,
    this.phone,
    this.countryId,
    this.profile,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        roles: (json['roles'] as List<dynamic>? ?? []).map((r) => r as String).toList(),
        status: json['status'] as String? ?? 'ACTIVE',
        countryId: json['countryId'] as String?,
        profile: json['profile'] != null ? Profile.fromJson(json['profile'] as Map<String, dynamic>) : null,
      );
}
