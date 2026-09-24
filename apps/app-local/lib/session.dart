import 'package:shared_preferences/shared_preferences.dart';

class Session {
  static const _keyToken = 'foodxpres_token';
  static const _keyStaffId = 'foodxpres_staff_id';
  static const _keyRestaurantId = 'foodxpres_restaurant_id';
  static const _keyName = 'foodxpres_name';

  static Future<void> guardar({
    required String token,
    required String staffId,
    required String restaurantId,
    required String name,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, token);
    await prefs.setString(_keyStaffId, staffId);
    await prefs.setString(_keyRestaurantId, restaurantId);
    await prefs.setString(_keyName, name);
  }

  static Future<Map<String, String?>> obtener() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'token': prefs.getString(_keyToken),
      'staffId': prefs.getString(_keyStaffId),
      'restaurantId': prefs.getString(_keyRestaurantId),
      'name': prefs.getString(_keyName),
    };
  }

  static Future<void> limpiar() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  static Future<bool> estaLogueado() async {
    final data = await obtener();
    return data['token'] != null;
  }
}