package com.coffeehub.vendor;

public enum DocumentType {
    GST(true),
    PAN(true),
    FSSAI(false),
    COMPANY_REGISTRATION(false),
    IEC(false),
    BANK_PROOF(true),
    ADDRESS_PROOF(true),
    CERTIFICATION(false);

    private final boolean required;

    DocumentType(boolean required) {
        this.required = required;
    }

    /** Required for every vendor before they can submit for verification; the rest apply "where applicable". */
    public boolean required() {
        return required;
    }
}
