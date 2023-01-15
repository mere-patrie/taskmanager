// Events when changing between login and sign-in
$("#loginFormBtn").click(() => {
    $("#signInEmail").parent().hide();
    $("#signInPassword").parent().hide();
    $("#loginEmail").parent().show();
    $("#loginPassword").parent().show();
    $("#formName").text("Se connecter");
    $("#submitLog").text("Se connecter");
    $("#userAgreement").text("En cliquant sur se connecter, vous acceptez les termes d'utilisation.");
});
$("#signInFormBtn").click(() => {
    $("#signInEmail").parent().show();
    $("#signInPassword").parent().show();
    $("#loginEmail").parent().hide();
    $("#loginPassword").parent().hide();
    $("#formName").text("Créer un compte");
    $("#submitLog").text("Créer");
    $("#userAgreement").text("En cliquant sur créer, vous acceptez les termes d'utilisation.");
});

// Login and sign-in form handlers
$("#loginForm").submit((e) => {
    e.preventDefault();
    $("#loginError").hide();
    if($("#loginFormBtn").attr("aria-selected") == "true"){
        const email = $("#loginEmail").val();
        const password = $("#loginPassword").val();

        if(isEmailValid(email)){
            if(password.length >0){
                $.post("/login", {password:password, email:email}, (data) => {
                    if(data.status == 400){
                        new formError(data.data).throw();
                    }else{
                        setCookie("token", data.data, 1);
                        location = "/dashboard"
                    }
                });
            }else{
                new formError("Entrez un mot de passe valide!").throw();
            }
        }else{
            new formError("L'email est mal formaté!").throw();
        }
    }else{
        const email = $("#signInEmail").val();
        const password = $("#signInPassword").val();
        if(isEmailValid(email)){
            if(password.length > 0){
                $.post("/sign-in", {password:password, email:email}, (data) => {
                    if(data.status == 400){
                        new formError(data.data).throw();
                    }else{
                        setCookie("token", data.data, 1);
                        location = "/dashboard"
                    }
                });
            }else{
                new formError("Votre mot de passe est trop cout!").throw();
            }
        }else{
            new formError("L'email est mal formaté!").throw();
        }
    }
});
function isEmailValid(email) {
    const regex =  /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/g;
    return regex.test(email);
}


// Errors

class formError {
    constructor(errorText){
        this.errorText = errorText;
    }
    throw() {
        $("#loginError").show();
        $("#loginError").html(`<strong>Erreur!</strong> ${this.errorText}`);
    }
}