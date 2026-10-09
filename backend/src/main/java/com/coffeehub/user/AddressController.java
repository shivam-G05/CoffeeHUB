package com.coffeehub.user;

import com.coffeehub.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
@Transactional
public class AddressController {

    private final AddressRepository addressRepository;

    public record AddressDto(Long id, String label, String name, String phone, String line1, String line2,
                             String city, String state, String pin, boolean defaultAddress) {
        static AddressDto from(Address a) {
            return new AddressDto(a.getId(), a.getLabel(), a.getName(), a.getPhone(), a.getLine1(), a.getLine2(),
                    a.getCity(), a.getState(), a.getPin(), a.isDefaultAddress());
        }
    }

    public record AddressRequest(
            @Size(max = 50) String label,
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 30) String phone,
            @NotBlank @Size(max = 255) String line1,
            @Size(max = 255) String line2,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 100) String state,
            @NotBlank @Pattern(regexp = "\\d{6}", message = "must be a 6-digit PIN code") String pin,
            boolean defaultAddress
    ) {}

    @GetMapping
    public List<AddressDto> list(@AuthenticationPrincipal User user) {
        return addressRepository.findByUserIdOrderByDefaultAddressDescIdDesc(user.getId()).stream().map(AddressDto::from).toList();
    }

    @PostMapping
    public AddressDto create(@AuthenticationPrincipal User user, @Valid @RequestBody AddressRequest req) {
        Address address = Address.builder().user(user).build();
        return AddressDto.from(apply(user, address, req));
    }

    @PutMapping("/{id}")
    public AddressDto update(@AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody AddressRequest req) {
        return AddressDto.from(apply(user, findOwned(user, id), req));
    }

    @DeleteMapping("/{id}")
    public void delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        addressRepository.delete(findOwned(user, id));
    }

    private Address apply(User user, Address address, AddressRequest req) {
        if (req.defaultAddress()) {
            addressRepository.findByUserIdOrderByDefaultAddressDescIdDesc(user.getId())
                    .forEach(a -> a.setDefaultAddress(false));
        }
        address.setLabel(req.label());
        address.setName(req.name());
        address.setPhone(req.phone());
        address.setLine1(req.line1());
        address.setLine2(req.line2());
        address.setCity(req.city());
        address.setState(req.state());
        address.setPin(req.pin());
        address.setDefaultAddress(req.defaultAddress());
        return addressRepository.save(address);
    }

    private Address findOwned(User user, Long id) {
        return addressRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Address not found"));
    }
}
