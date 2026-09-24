import 'package:flutter/material.dart';

class FloatingNavItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const FloatingNavItem({required this.icon, required this.selectedIcon, required this.label});
}

/// A floating, pill-shaped bottom navigation bar with a prominent circular action button
/// raised above its center — DiakMarket's take on the "sell" button pattern common to C2C
/// marketplace apps (Vinted-style), rather than a flat edge-to-edge Material NavigationBar.
class FloatingNavBar extends StatelessWidget {
  final List<FloatingNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTabSelected;
  final IconData centerIcon;
  final VoidCallback onCenterTap;

  const FloatingNavBar({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTabSelected,
    required this.onCenterTap,
    this.centerIcon = Icons.add,
  }) : assert(items.length == 4, 'FloatingNavBar expects exactly 4 side items around the center button');

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final leftItems = items.sublist(0, 2);
    final rightItems = items.sublist(2, 4);

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
        child: SizedBox(
          height: 76,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.topCenter,
            children: [
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  height: 64,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(32),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 24, offset: const Offset(0, 10)),
                    ],
                  ),
                  child: Row(
                    children: [
                      for (var i = 0; i < leftItems.length; i++)
                        Expanded(child: _NavButton(item: leftItems[i], selected: currentIndex == i, onTap: () => onTabSelected(i))),
                      const SizedBox(width: 68),
                      for (var i = 0; i < rightItems.length; i++)
                        Expanded(
                          child: _NavButton(
                            item: rightItems[i],
                            selected: currentIndex == i + 2,
                            onTap: () => onTabSelected(i + 2),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              Positioned(
                top: 0,
                child: GestureDetector(
                  onTap: onCenterTap,
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: scheme.primary,
                      boxShadow: [
                        BoxShadow(color: scheme.primary.withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0, 6)),
                      ],
                    ),
                    child: Icon(centerIcon, color: Colors.white, size: 28),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  final FloatingNavItem item;
  final bool selected;
  final VoidCallback onTap;

  const _NavButton({required this.item, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      customBorder: const StadiumBorder(),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: selected ? scheme.primaryContainer : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(selected ? item.selectedIcon : item.icon, color: selected ? scheme.primary : Colors.grey.shade500, size: 22),
            const SizedBox(height: 2),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              softWrap: false,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? scheme.primary : Colors.grey.shade500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
