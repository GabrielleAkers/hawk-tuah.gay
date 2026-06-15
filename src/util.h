#pragma once

#include <variant>
#include <type_traits>

namespace gay {

template <typename T> struct is_variant : std::false_type {};

template <typename... Args>
struct is_variant<std::variant<Args...>> : std::true_type {};

template <typename T> inline constexpr bool is_variant_v = is_variant<T>::value;

} // namespace gay